import { JestProjectSchema } from '../schema';
import {
  Tree,
  offsetFromRoot,
  generateFiles,
  readProjectConfiguration,
} from '@nrwl/devkit';
import { join } from 'path';

export function createFiles(tree: Tree, options: JestProjectSchema) {
  const projectConfig = readProjectConfiguration(tree, options.project);

  const filesFolder =
    options.setupFile === 'angular' ? '../files-angular' : '../files';

  let transformer: string;
  if (options.compiler === 'babel' || options.babelJest) {
    transformer = 'babel-jest';
  } else if (options.compiler === 'swc') {
    transformer = '@swc/jest';
  } else {
    transformer = 'ts-jest';
  }

  generateFiles(tree, join(__dirname, filesFolder), projectConfig.root, {
    tmpl: '',
    ...options,
    transformer,
    projectRoot: projectConfig.root,
    offsetFromRoot: offsetFromRoot(projectConfig.root),
  });

  if (options.setupFile === 'none') {
    tree.delete(join(projectConfig.root, './src/test-setup.ts'));
  }
}
