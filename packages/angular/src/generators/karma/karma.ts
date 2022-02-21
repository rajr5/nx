import type { Tree } from '@nrwl/devkit';
import {
  addDependenciesToPackageJson,
  generateFiles,
  joinPathFragments,
  readJson,
} from '@nrwl/devkit';
import { GeneratorOptions } from './schema';

export function karmaGenerator(tree: Tree, options: GeneratorOptions) {
  const packageJson = readJson(tree, 'package.json');
  if (packageJson.devDependencies['karma']) {
    return;
  }

  generateFiles(tree, joinPathFragments(__dirname, 'files'), '.', { tmpl: '' });

  return !options.skipPackageJson
    ? addDependenciesToPackageJson(
        tree,
        {},
        {
          karma: '~6.3.0',
          'karma-chrome-launcher': '~3.1.0',
          'karma-coverage': '~2.2.0',
          'karma-jasmine': '~4.0.0',
          'karma-jasmine-html-reporter': '~1.7.0',
          'jasmine-core': '~3.10.0',
          'jasmine-spec-reporter': '~5.0.0',
          '@types/jasmine': '~3.5.0',
        }
      )
    : () => {};
}

export default karmaGenerator;
