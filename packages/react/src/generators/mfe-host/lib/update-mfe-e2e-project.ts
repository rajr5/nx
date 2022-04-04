import { Tree } from 'nx/src/shared/tree';
import { NormalizedSchema } from '../schema';
import {
  readProjectConfiguration,
  updateProjectConfiguration,
} from '@nrwl/devkit';

export function updateMfeE2eProject(host: Tree, options: NormalizedSchema) {
  const e2eName = `${options.name}-e2e`;
  try {
    let projectConfig = readProjectConfiguration(host, e2eName);
    projectConfig.targets.e2e.options = {
      ...projectConfig.targets.e2e.options,
      baseUrl: 'http://localhost:4200',
    };
    updateProjectConfiguration(host, e2eName, projectConfig);
  } catch {
    // nothing
  }
}
