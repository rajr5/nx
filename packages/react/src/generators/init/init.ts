import { InitSchema } from './schema';
import {
  addDependenciesToPackageJson,
  convertNxGenerator,
  GeneratorCallback,
  readWorkspaceConfiguration,
  Tree,
  updateWorkspaceConfiguration,
} from '@nrwl/devkit';
import { jestInitGenerator } from '@nrwl/jest';
import { cypressInitGenerator } from '@nrwl/cypress';
import { webInitGenerator } from '@nrwl/web';
import { setDefaultCollection } from '@nrwl/workspace/src/utilities/set-default-collection';
import { parallelizeTasks } from '@nrwl/workspace/src/utilities/parallelize-tasks';
import {
  nxVersion,
  reactDomVersion,
  reactVersion,
  testingLibraryReactVersion,
  typesReactDomVersion,
  typesReactVersion,
} from '../../utils/versions';

function setDefault(host: Tree) {
  const workspace = readWorkspaceConfiguration(host);

  workspace.generators = workspace.generators || {};
  const reactGenerators = workspace.generators['@nrwl/react'] || {};
  const generators = {
    ...workspace.generators,
    '@nrwl/react': {
      ...reactGenerators,
      application: {
        ...reactGenerators.application,
        babel: true,
      },
    },
  };

  updateWorkspaceConfiguration(host, { ...workspace, generators });
  setDefaultCollection(host, '@nrwl/react');
}

export async function reactInitGenerator(host: Tree, schema: InitSchema) {
  const tasks: GeneratorCallback[] = [];

  setDefault(host);

  if (!schema.unitTestRunner || schema.unitTestRunner === 'jest') {
    const jestTask = jestInitGenerator(host, {});
    tasks.push(jestTask);
  }
  if (!schema.e2eTestRunner || schema.e2eTestRunner === 'cypress') {
    const cypressTask = cypressInitGenerator(host);
    tasks.push(cypressTask);
  }

  const initTask = await webInitGenerator(host, schema);
  tasks.push(initTask);
  const installTask = addDependenciesToPackageJson(
    host,
    {
      'core-js': '^3.6.5',
      react: reactVersion,
      'react-dom': reactDomVersion,
      tslib: '^2.0.0',
    },
    {
      '@nrwl/react': nxVersion,
      '@types/react': typesReactVersion,
      '@types/react-dom': typesReactDomVersion,
      '@testing-library/react': testingLibraryReactVersion,
    }
  );
  tasks.push(installTask);

  return parallelizeTasks(...tasks);
}

export default reactInitGenerator;

export const reactInitSchematic = convertNxGenerator(reactInitGenerator);
