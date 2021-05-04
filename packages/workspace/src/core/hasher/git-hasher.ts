import { spawnSync } from 'child_process';
import { join } from 'path';
import { statSync } from 'fs';

function parseGitLsTree(output: string): Map<string, string> {
  const changes: Map<string, string> = new Map<string, string>();
  if (output) {
    const gitRegex: RegExp = /([0-9]{6})\s(blob|commit)\s([a-f0-9]{40})\s*(.*)/;
    output.split('\0').forEach((line) => {
      if (line) {
        const matches: RegExpMatchArray | null = line.match(gitRegex);
        if (matches && matches[3] && matches[4]) {
          const hash: string = matches[3];
          const filename: string = matches[4];
          changes.set(filename, hash);
        } else {
          throw new Error(`Cannot parse git ls-tree input: "${line}"`);
        }
      }
    });
  }
  return changes;
}

function parseGitStatus(path: string): Map<string, string> {
  const output = spawnProcess('git', ['status', '-s', '-u', '-z', '.'], path);
  const changes: Map<string, string> = new Map<string, string>();
  if (!output) {
    return changes;
  }

  // Because `-z` doesn't respect the relative paths configuration,
  // we need to manually strip the root path from the filenames.
  const prefix = spawnProcess('git', ['rev-parse', '--show-prefix'], path);

  var chunks = output.split('\0');
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    if (chunk.length) {
      // The XY is the two-letter status code.
      // See: https://git-scm.com/docs/git-status#_short_format
      const X = chunk[0].trim();
      const Y = chunk[1].trim();
      const filename = chunk.substring(3).replace(new RegExp(`^${prefix}`), '');
      if (X === 'R') {
        changes.set(chunks[++i], 'D');
      }
      // If both present, Y shows the status of the working tree
      changes.set(filename, Y || X);
    }
  }
  return changes;
}

function spawnProcess(command: string, args: string[], cwd: string): string {
  const r = spawnSync(command, args, { cwd, maxBuffer: 50 * 1024 * 1024 });
  if (r.status !== 0) {
    throw new Error(
      `Failed to run ${command} ${args.join(' ')}.\n${r.stdout}\n${r.stderr}`
    );
  }
  return r.stdout.toString().trimEnd();
}

function getGitHashForFiles(
  filesToHash: string[],
  path: string
): Map<string, string> {
  const changes: Map<string, string> = new Map<string, string>();
  if (filesToHash.length) {
    const hashStdout = spawnProcess(
      'git',
      ['hash-object', ...filesToHash],
      path
    );
    const hashes: string[] = hashStdout.split('\n');
    if (hashes.length !== filesToHash.length) {
      throw new Error(
        `Passed ${filesToHash.length} file paths to Git to hash, but received ${hashes.length} hashes.`
      );
    }
    for (let i = 0; i < hashes.length; i++) {
      const hash: string = hashes[i];
      const filePath: string = filesToHash[i];
      changes.set(filePath, hash);
    }
  }
  return changes;
}

function gitLsTree(path: string): Map<string, string> {
  return parseGitLsTree(
    spawnProcess('git', ['ls-tree', 'HEAD', '-r', '-z'], path)
  );
}

function gitStatus(
  path: string
): { status: Map<string, string>; deletedFiles: string[] } {
  const deletedFiles: string[] = [];
  const filesToHash: string[] = [];
  parseGitStatus(path).forEach((changeType: string, filename: string) => {
    if (changeType !== 'D') {
      filesToHash.push(filename);
    } else {
      deletedFiles.push(filename);
    }
  });

  const updated = checkForDeletedFiles(path, filesToHash, deletedFiles);
  const status = getGitHashForFiles(updated.filesToHash, path);
  return { deletedFiles: updated.deletedFiles, status };
}

/**
 * This is only needed because of potential issues with interpreting "git status".
 * We had a few issues where we didn't interpret renames correctly. Even though
 * doing this somewhat slow, we will keep it for now.
 *
 * @vsavkin remove it in nx 10.2
 */
function checkForDeletedFiles(
  path: string,
  files: string[],
  deletedFiles: string[]
) {
  let filesToHash = [];

  files.forEach((f) => {
    try {
      statSync(join(path, f)).isFile();
      filesToHash.push(f);
    } catch {
      console.warn(
        `Warning: Fell back to using 'fs' to identify ${f} as deleted. Please open an issue at https://github.com/nrwl/nx so we can investigate.`
      );
      deletedFiles.push(f);
    }
  });

  return { filesToHash, deletedFiles };
}

export function getFileHashes(path: string): Map<string, string> {
  const res = new Map<string, string>();

  try {
    const { deletedFiles, status } = gitStatus(path);
    const m1 = gitLsTree(path);
    m1.forEach((hash: string, filename: string) => {
      if (deletedFiles.indexOf(filename) === -1) {
        res.set(`${path}/${filename}`, hash);
      }
    });
    status.forEach((hash: string, filename: string) => {
      res.set(`${path}/${filename}`, hash);
    });
    return res;
  } catch (e) {
    // this strategy is only used for speeding things up.
    // ignoring all the errors
    if (process.env.NX_GIT_HASHER_LOGGING) {
      console.error(`Internal error:`);
      console.error(e);
    }
    return new Map<string, string>();
  }
}
