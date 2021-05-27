import type { Tree } from '@nrwl/tao/src/shared/tree';
import { reformattedWorkspaceJsonOrNull } from '@nrwl/tao/src/shared/workspace';
import * as path from 'path';
import type * as Prettier from 'prettier';
import { getWorkspacePath } from '../utils/get-workspace-layout';
import { readJson, writeJson } from '../utils/json';

/**
 * Formats all the created or updated files using Prettier
 * @param host - the file system tree
 */
export async function formatFiles(host: Tree): Promise<void> {
  let prettier: typeof Prettier;
  try {
    prettier = require('prettier');
  } catch {}

  updateWorkspaceJsonToMatchFormatVersion(host);

  if (!prettier) return;

  const files = new Set(
    host.listChanges().filter((file) => file.type !== 'DELETE')
  );
  await Promise.all(
    Array.from(files).map(async (file) => {
      const systemPath = path.join(host.root, file.path);
      let options: any = {
        filepath: systemPath,
      };

      const resolvedOptions = await prettier.resolveConfig(systemPath);
      if (!resolvedOptions) {
        return;
      }
      options = {
        ...options,
        ...resolvedOptions,
      };

      const support = await prettier.getFileInfo(systemPath, options);
      if (support.ignored || !support.inferredParser) {
        return;
      }

      try {
        host.write(
          file.path,
          prettier.format(file.content.toString('utf-8'), options)
        );
      } catch (e) {
        console.warn(`Could not format ${file.path}. Error: "${e.message}"`);
      }
    })
  );
}

function updateWorkspaceJsonToMatchFormatVersion(host: Tree) {
  const path = getWorkspacePath(host);
  if (!path) {
    return;
  }

  try {
    const workspaceJson = readJson(host, path);
    const reformatted = reformattedWorkspaceJsonOrNull(workspaceJson);
    if (reformatted) {
      writeJson(host, path, reformatted);
    }
  } catch (e) {
    console.error(`Failed to format: ${path}`);
    console.error(e);
  }
}
