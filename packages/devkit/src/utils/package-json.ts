import { readJson, updateJson } from './json';
import { installPackagesTask } from '../tasks/install-packages-task';

import { Tree } from '@nrwl/tao/src/shared/tree';
import { GeneratorCallback } from '@nrwl/tao/src/shared/workspace';

/**
 * Add Dependencies and Dev Dependencies to package.json
 *
 * For example, `addDependenciesToPackageJson(host, { react: 'latest' }, { jest: 'latest' })`
 * will add `react` and `jest` to the dependencies and devDependencies sections of package.json respectively
 *
 * @param dependencies Dependencies to be added to the dependencies section of package.json
 * @param devDependencies Dependencies to be added to the devDependencies section of package.json
 * @returns Callback to install dependencies only if necessary. undefined is returned if changes are not necessary.
 */
export function addDependenciesToPackageJson(
  host: Tree,
  dependencies: Record<string, string>,
  devDependencies: Record<string, string>,
  packageJsonPath: string = 'package.json'
): GeneratorCallback | undefined {
  const currentPackageJson = readJson(host, packageJsonPath);

  if (
    requiresAddingOfPackages(currentPackageJson, dependencies, devDependencies)
  ) {
    updateJson(host, packageJsonPath, (json) => {
      json.dependencies = {
        ...(json.dependencies || {}),
        ...dependencies,
        ...(json.dependencies || {}),
      };
      json.devDependencies = {
        ...(json.devDependencies || {}),
        ...devDependencies,
        ...(json.devDependencies || {}),
      };
      json.dependencies = sortObjectByKeys(json.dependencies);
      json.devDependencies = sortObjectByKeys(json.devDependencies);

      return json;
    });
    return () => {
      installPackagesTask(host);
    };
  }
}

function sortObjectByKeys(obj: unknown) {
  return Object.keys(obj)
    .sort()
    .reduce((result, key) => {
      return {
        ...result,
        [key]: obj[key],
      };
    }, {});
}

/**
 * Verifies whether the given packageJson dependencies require an update
 * given the deps & devDeps passed in
 */
function requiresAddingOfPackages(packageJsonFile, deps, devDeps): boolean {
  let needsDepsUpdate = false;
  let needsDevDepsUpdate = false;

  packageJsonFile.dependencies = packageJsonFile.dependencies || {};
  packageJsonFile.devDependencies = packageJsonFile.devDependencies || {};

  if (Object.keys(deps).length > 0) {
    needsDepsUpdate = Object.keys(deps).some(
      (entry) => !packageJsonFile.dependencies[entry]
    );
  }

  if (Object.keys(devDeps).length > 0) {
    needsDevDepsUpdate = Object.keys(devDeps).some(
      (entry) => !packageJsonFile.devDependencies[entry]
    );
  }

  return needsDepsUpdate || needsDevDepsUpdate;
}
