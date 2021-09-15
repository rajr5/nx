import {
  toOldFormatOrNull,
  WorkspaceJsonConfiguration,
  Workspaces,
} from '@nrwl/tao/src/shared/workspace';
import type {
  FileData,
  NxJsonConfiguration,
  NxJsonProjectConfiguration,
  ProjectGraphNode,
} from '@nrwl/devkit';
import { execSync } from 'child_process';
import { readFileSync, readdirSync, existsSync, statSync } from 'fs';
import { extname, join, relative, sep } from 'path';
import { performance } from 'perf_hooks';
import type { NxArgs } from '../command-line/utils';
import { WorkspaceResults } from '../command-line/workspace-results';
import { appRootPath } from '@nrwl/tao/src/utils/app-root';
import { appendArray } from '../utilities/array';
import { fileExists, readJsonFile } from '../utilities/fileutils';
import { jsonDiff } from '../utilities/json-diff';
import { defaultFileHasher } from './hasher/file-hasher';
import type { Environment } from './shared-interfaces';
import { projectFileDataCompatAdapter } from './project-graph/project-graph';

const ignore = require('ignore');

export interface Change {
  type: string;
}

export interface FileChange<T extends Change = Change> extends FileData {
  getChanges: () => T[];
}

export class WholeFileChange implements Change {
  type = 'WholeFileChange';
}

export function isWholeFileChange(change: Change): change is WholeFileChange {
  return change.type === 'WholeFileChange';
}

export function calculateFileChanges(
  files: string[],
  nxArgs?: NxArgs,
  readFileAtRevision: (
    f: string,
    r: void | string
  ) => string = defaultReadFileAtRevision,
  ignore = getIgnoredGlobs()
): FileChange[] {
  if (ignore) {
    files = files.filter((f) => !ignore.ignores(f));
  }

  return files.map((f) => {
    const ext = extname(f);
    const hash = defaultFileHasher.hashFile(f);

    return {
      file: f,
      ext,
      hash,
      getChanges: (): Change[] => {
        if (!nxArgs) {
          return [new WholeFileChange()];
        }

        if (nxArgs.files && nxArgs.files.includes(f)) {
          return [new WholeFileChange()];
        }
        switch (ext) {
          case '.json':
            const atBase = readFileAtRevision(f, nxArgs.base);
            const atHead = readFileAtRevision(f, nxArgs.head);

            try {
              return jsonDiff(JSON.parse(atBase), JSON.parse(atHead));
            } catch (e) {
              return [new WholeFileChange()];
            }
          default:
            return [new WholeFileChange()];
        }
      },
    };
  });
}

export const TEN_MEGABYTES = 1024 * 10000;

function defaultReadFileAtRevision(
  file: string,
  revision: void | string
): string {
  try {
    const fileFullPath = `${appRootPath}${sep}${file}`;
    const gitRepositoryPath = execSync('git rev-parse --show-toplevel')
      .toString()
      .trim();
    const filePathInGitRepository = relative(gitRepositoryPath, fileFullPath)
      .split(sep)
      .join('/');
    return !revision
      ? readFileSync(file, 'utf-8')
      : execSync(`git show ${revision}:${filePathInGitRepository}`, {
          maxBuffer: TEN_MEGABYTES,
        })
          .toString()
          .trim();
  } catch {
    return '';
  }
}

function getFileData(filePath: string): FileData {
  const file = relative(appRootPath, filePath).split(sep).join('/');
  return {
    file,
    hash: defaultFileHasher.hashFile(filePath),
  };
}

export function allFilesInDir(
  dirName: string,
  recurse: boolean = true,
  projectGraphVersion = '3.0'
): FileData[] {
  const ignoredGlobs = getIgnoredGlobs();
  const relDirName = relative(appRootPath, dirName);
  if (relDirName && ignoredGlobs.ignores(relDirName)) {
    return [];
  }

  let res = [];
  try {
    readdirSync(dirName).forEach((c) => {
      const child = join(dirName, c);
      if (ignoredGlobs.ignores(relative(appRootPath, child))) {
        return;
      }
      try {
        const s = statSync(child);
        if (!s.isDirectory()) {
          // add starting with "apps/myapp/..." or "libs/mylib/..."
          res.push(
            projectFileDataCompatAdapter(
              getFileData(child),
              projectGraphVersion
            )
          );
        } else if (s.isDirectory() && recurse) {
          res = [...res, ...allFilesInDir(child, true, projectGraphVersion)];
        }
      } catch (e) {}
    });
  } catch (e) {}
  return res;
}

function getIgnoredGlobs() {
  const ig = ignore();
  ig.add(readFileIfExisting(`${appRootPath}/.gitignore`));
  ig.add(readFileIfExisting(`${appRootPath}/.nxignore`));
  return ig;
}

export function readFileIfExisting(path: string) {
  return existsSync(path) ? readFileSync(path, 'utf-8') : '';
}

export function readWorkspaceJson(): WorkspaceJsonConfiguration {
  return readWorkspaceConfig({
    format: 'nx',
    path: appRootPath,
  });
}

export function readWorkspaceConfig(opts: {
  format: 'angularCli' | 'nx';
  path?: string;
}) {
  const ws = new Workspaces(opts.path || process.cwd());
  const json = ws.readWorkspaceConfiguration();
  if (opts.format === 'angularCli') {
    const formatted = toOldFormatOrNull(json);
    return formatted ?? json;
  } else {
    return json;
  }
}

export function workspaceFileName() {
  if (fileExists(`${appRootPath}/angular.json`)) {
    return 'angular.json';
  } else {
    return 'workspace.json';
  }
}

export type FileRead = (s: string) => string;

export function defaultFileRead(filePath: string): string | null {
  return readFileSync(join(appRootPath, filePath), 'utf-8');
}

export function readPackageJson(): any {
  return readJsonFile(`${appRootPath}/package.json`);
}

export function readNxJson(
  path: string = `${appRootPath}/nx.json`
): NxJsonConfiguration {
  const config = readJsonFile<NxJsonConfiguration>(path);
  if (!config.npmScope) {
    throw new Error(`nx.json must define the npmScope property.`);
  }

  // NOTE: As we work towards removing nx.json, some settings are now found in
  // the workspace.json file. Currently this is only supported for projects
  // with separated configs, as they list tags / implicit deps inside the project.json file.
  const workspace = readWorkspaceConfig({ format: 'nx', path: appRootPath });
  Object.entries(workspace.projects).forEach(
    ([project, projectConfig]: [string, NxJsonProjectConfiguration]) => {
      config.projects ??= {};
      if (!config.projects[project]) {
        const { tags, implicitDependencies } = projectConfig;
        config.projects[project] = { tags, implicitDependencies };
      }
    }
  );

  const nxJsonExtends = readNxJsonExtends(config as any);
  if (nxJsonExtends) {
    return { ...nxJsonExtends, ...config };
  } else {
    return config;
  }
}

function readNxJsonExtends(nxJson: { extends?: string }) {
  if (nxJson.extends) {
    const extendsPath = nxJson.extends;
    try {
      return readJsonFile(require.resolve(extendsPath));
    } catch (e) {
      throw new Error(`Unable to resolve nx.json extends. Error: ${e.message}`);
    }
  } else {
    return null;
  }
}

export function workspaceLayout(): { appsDir: string; libsDir: string } {
  const nxJson = readNxJson();
  return {
    appsDir: nxJson.workspaceLayout?.appsDir ?? 'apps',
    libsDir: nxJson.workspaceLayout?.libsDir ?? 'libs',
  };
}

// TODO: Make this list extensible
export function rootWorkspaceFileNames(): string[] {
  return [`package.json`, workspaceFileName(), `nx.json`, `tsconfig.base.json`];
}

export function rootWorkspaceFileData(projectGraphVersion = '3.0'): FileData[] {
  return rootWorkspaceFileNames().map((f) =>
    projectFileDataCompatAdapter(
      getFileData(`${appRootPath}/${f}`),
      projectGraphVersion
    )
  );
}

export function readWorkspaceFiles(projectGraphVersion = '3.0'): FileData[] {
  defaultFileHasher.ensureInitialized();
  performance.mark('read workspace files:start');

  if (defaultFileHasher.usesGitForHashing) {
    const ignoredGlobs = getIgnoredGlobs();
    const r = Array.from(defaultFileHasher.workspaceFiles)
      .filter((f) => !ignoredGlobs.ignores(f))
      .map((f) =>
        projectFileDataCompatAdapter(
          getFileData(`${appRootPath}/${f}`),
          projectGraphVersion
        )
      );
    performance.mark('read workspace files:end');
    performance.measure(
      'read workspace files',
      'read workspace files:start',
      'read workspace files:end'
    );
    r.sort((x, y) => x.file.localeCompare(y.file));
    return r;
  } else {
    const r = [];
    r.push(...rootWorkspaceFileData(projectGraphVersion));

    // Add known workspace files and directories
    appendArray(r, allFilesInDir(appRootPath, false, projectGraphVersion));
    appendArray(
      r,
      allFilesInDir(`${appRootPath}/tools`, true, projectGraphVersion)
    );
    const wl = workspaceLayout();
    appendArray(
      r,
      allFilesInDir(`${appRootPath}/${wl.appsDir}`, true, projectGraphVersion)
    );
    if (wl.appsDir !== wl.libsDir) {
      appendArray(
        r,
        allFilesInDir(`${appRootPath}/${wl.libsDir}`, true, projectGraphVersion)
      );
    }
    performance.mark('read workspace files:end');
    performance.measure(
      'read workspace files',
      'read workspace files:start',
      'read workspace files:end'
    );
    r.sort((x, y) => x.file.localeCompare(y.file));
    return r;
  }
}

export function readEnvironment(
  target: string,
  projects: Record<string, ProjectGraphNode>
): Environment {
  const nxJson = readNxJson();
  const workspaceJson = readWorkspaceJson();
  const workspaceResults = new WorkspaceResults(target, projects);

  return { nxJson, workspaceJson, workspaceResults } as any;
}

export function normalizedProjectRoot(p: ProjectGraphNode): string {
  if (p.data && p.data.root) {
    const path = p.data.root.split('/').filter((v) => !!v);
    if (path.length === 1) {
      return path[0];
    }
    // Remove the first part of the path, usually 'libs'
    return path.slice(1).join('/');
  } else {
    return '';
  }
}

// Original Exports
export { FileData };
