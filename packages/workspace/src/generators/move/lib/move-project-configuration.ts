import {
  addProjectConfiguration,
  NxJsonProjectConfiguration,
  ProjectConfiguration,
  removeProjectConfiguration,
  Tree,
} from '@nrwl/devkit';
import { NormalizedSchema } from '../schema';

export function moveProjectConfiguration(
  tree: Tree,
  schema: NormalizedSchema,
  projectConfig: ProjectConfiguration & NxJsonProjectConfiguration
) {
  const projectString = JSON.stringify(projectConfig);
  const newProjectString = projectString.replace(
    new RegExp(projectConfig.root, 'g'),
    schema.relativeToRootDestination
  );

  // rename
  const newProject: ProjectConfiguration = JSON.parse(newProjectString);

  // Delete the original project
  removeProjectConfiguration(tree, schema.projectName);

  // Create a new project with the root replaced
  addProjectConfiguration(tree, schema.newProjectName, newProject);
}
