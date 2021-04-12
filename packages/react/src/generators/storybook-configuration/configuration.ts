import { StorybookConfigureSchema } from './schema';
import storiesGenerator from '../stories/stories';
import { convertNxGenerator, Tree } from '@nrwl/devkit';
import { configurationGenerator } from '@nrwl/storybook';
import { getE2eProjectName } from '@nrwl/cypress';

async function generateStories(host: Tree, schema: StorybookConfigureSchema) {
  const cypressProject = getE2eProjectName({
    name: schema.cypressName || `${schema.name}-e2e`,
    directory: schema.cypressDirectory,
  });
  await storiesGenerator(host, {
    project: schema.name,
    generateCypressSpecs:
      schema.configureCypress && schema.generateCypressSpecs,
    js: schema.js,
    cypressProject,
  });
}

export async function storybookConfigurationGenerator(
  host: Tree,
  schema: StorybookConfigureSchema
) {
  const installTask = await configurationGenerator(host, {
    name: schema.name,
    uiFramework: '@storybook/react',
    configureCypress: schema.configureCypress,
    js: schema.js,
    linter: schema.linter,
    cypressDirectory: schema.cypressDirectory,
    cypressName: schema.cypressName,
  });

  if (schema.generateStories) {
    await generateStories(host, schema);
  }

  return installTask;
}

export default storybookConfigurationGenerator;
export const storybookConfigurationSchematic = convertNxGenerator(
  storybookConfigurationGenerator
);
