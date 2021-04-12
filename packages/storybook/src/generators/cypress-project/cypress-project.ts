import {
  convertNxGenerator,
  formatFiles,
  readProjectConfiguration,
  Tree,
  updateJson,
  updateProjectConfiguration,
} from '@nrwl/devkit';

import { Linter } from '@nrwl/linter';
import {
  cypressProjectGenerator as _cypressProjectGenerator,
  getE2eProjectName,
} from '@nrwl/cypress';
import { safeFileDelete } from '../../utils/utilities';

export interface CypressConfigureSchema {
  name: string;
  cypressName?: string;
  js?: boolean;
  directory?: string;
  linter: Linter;
}

export async function cypressProjectGenerator(
  tree: Tree,
  schema: CypressConfigureSchema
) {
  const e2eProjectName = schema.cypressName || `${schema.name}-e2e`;
  const installTask = await _cypressProjectGenerator(tree, {
    name: e2eProjectName,
    project: schema.name,
    js: schema.js,
    linter: schema.linter,
    directory: schema.directory,
  });
  const generatedCypressProjectName = getE2eProjectName({
    name: e2eProjectName,
    directory: schema.directory,
  });
  removeUnneededFiles(tree, generatedCypressProjectName, schema.js);
  addBaseUrlToCypressConfig(tree, generatedCypressProjectName);
  updateAngularJsonBuilder(tree, generatedCypressProjectName, schema.name);

  await formatFiles(tree);

  return installTask;
}

function removeUnneededFiles(tree: Tree, projectName: string, js: boolean) {
  const { sourceRoot } = readProjectConfiguration(tree, projectName);
  const fileType = js ? 'js' : 'ts';
  safeFileDelete(tree, `${sourceRoot}/integration/app.spec.${fileType}`);
  safeFileDelete(tree, `${sourceRoot}/support/app.po.${fileType}`);
}

function addBaseUrlToCypressConfig(tree: Tree, projectName: string) {
  const cypressConfigPath = `${
    readProjectConfiguration(tree, projectName).root
  }/cypress.json`;
  updateJson(tree, cypressConfigPath, (cypressConfig) => {
    cypressConfig.baseUrl = 'http://localhost:4400';
    return cypressConfig;
  });
}

function updateAngularJsonBuilder(
  tree: Tree,
  e2eProjectName: string,
  targetProjectName: string
) {
  const project = readProjectConfiguration(tree, e2eProjectName);
  const e2eTarget = project.targets.e2e;
  project.targets.e2e = {
    ...e2eTarget,
    options: <any>{
      ...e2eTarget.options,
      devServerTarget: `${targetProjectName}:storybook`,
    },
    configurations: {
      ci: {
        devServerTarget: `${targetProjectName}:storybook:ci`,
      },
    },
  };
  updateProjectConfiguration(tree, e2eProjectName, project);
}

export default cypressProjectGenerator;
export const cypressProjectSchematic = convertNxGenerator(
  cypressProjectGenerator
);
