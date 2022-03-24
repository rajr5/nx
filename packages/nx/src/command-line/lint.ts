import { WorkspaceIntegrityChecks } from './workspace-integrity-checks';
import { FileData, workspaceLayout } from '../core/file-utils';
import { output } from '../utils/output';
import * as path from 'path';
import { createProjectGraphAsync } from '../core/project-graph/project-graph';
import { pruneExternalNodes } from '../core/project-graph/operators';

export async function workspaceLint(): Promise<void> {
  const graph = await createProjectGraphAsync();
  const allWorkspaceFiles = graph.allWorkspaceFiles;
  const projectGraph = pruneExternalNodes(graph);

  const cliErrorOutputConfigs = new WorkspaceIntegrityChecks(
    projectGraph,
    readAllFilesFromAppsAndLibs(allWorkspaceFiles)
  ).run();

  if (cliErrorOutputConfigs.length > 0) {
    cliErrorOutputConfigs.forEach((errorConfig) => {
      output.error(errorConfig);
    });
    process.exit(1);
  }
}

function readAllFilesFromAppsAndLibs(allWorkspaceFiles: FileData[]) {
  const wl = workspaceLayout();
  return allWorkspaceFiles
    .map((f) => f.file)
    .filter(
      (f) => f.startsWith(`${wl.appsDir}/`) || f.startsWith(`${wl.libsDir}/`)
    )
    .filter((f) => !path.basename(f).startsWith('.'));
}
