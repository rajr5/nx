import { readNxJson, readWorkspaceJson } from '../project-graph/file-utils';
import { NxJsonConfiguration } from '../config/nx-json';

export interface Environment {
  nxJson: NxJsonConfiguration;
  workspaceJson: any;
  /**
   * @deprecated the field will be removed after Nx 14 is released. It's left here
   * not to break the type checker in case someone extends
   * the tasks runner
   */
  workspaceResults: any;
}

export function readEnvironment(): Environment {
  const nxJson = readNxJson();
  const workspaceJson = readWorkspaceJson();
  return { nxJson, workspaceJson, workspaceResults: null } as any;
}
