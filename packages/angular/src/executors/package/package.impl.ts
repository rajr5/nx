import type { ExecutorContext } from '@nrwl/devkit';
import { readCachedProjectGraph } from '@nrwl/workspace/src/core/project-graph';
import type { DependentBuildableProjectNode } from '@nrwl/workspace/src/utilities/buildable-libs-utils';
import {
  calculateProjectDependencies,
  checkDependentProjectsHaveBeenBuilt,
  updateBuildableProjectPackageJsonDependencies,
  updatePaths,
} from '@nrwl/workspace/src/utilities/buildable-libs-utils';
import type { NgPackagr } from 'ng-packagr';
import { ngCompilerCli } from 'ng-packagr/lib/utils/ng-compiler-cli';
import { resolve } from 'path';
import { from } from 'rxjs';
import { eachValueFrom } from 'rxjs-for-await';
import { mapTo, switchMap, tap } from 'rxjs/operators';
import * as ts from 'typescript';
import { NX_ENTRY_POINT_PROVIDERS } from './ng-packagr-adjustments/ng-package/entry-point/entry-point.di';
import {
  NX_PACKAGE_PROVIDERS,
  NX_PACKAGE_TRANSFORM,
} from './ng-packagr-adjustments/ng-package/package.di';
import type { BuildAngularLibraryExecutorOptions } from './schema';

async function initializeNgPackagr(
  options: BuildAngularLibraryExecutorOptions,
  context: ExecutorContext,
  projectDependencies: DependentBuildableProjectNode[]
): Promise<NgPackagr> {
  const packager = new (await import('ng-packagr')).NgPackagr([
    ...NX_PACKAGE_PROVIDERS,
    ...NX_ENTRY_POINT_PROVIDERS,
  ]);

  packager.forProject(resolve(context.root, options.project));
  packager.withBuildTransform(NX_PACKAGE_TRANSFORM.provide);

  // read the tsconfig and modify its path in memory to
  // pass it on to ngpackagr if specified
  if (options.tsConfig) {
    // read the tsconfig and modify its path in memory to
    // pass it on to ngpackagr
    const parsedTSConfig = (await ngCompilerCli()).readConfiguration(
      options.tsConfig
    );
    updatePaths(projectDependencies, parsedTSConfig.options.paths);
    packager.withTsConfig(parsedTSConfig);
  }

  return packager;
}

/**
 * Creates an executor function that executes the library build of an Angular
 * package using ng-packagr.
 * @param initializeNgPackagr function that returns an ngPackagr instance to use for the build.
 */
export function createLibraryExecutor(
  initializeNgPackagr: (
    options: BuildAngularLibraryExecutorOptions,
    context: ExecutorContext,
    projectDependencies: DependentBuildableProjectNode[]
  ) => Promise<NgPackagr>
) {
  return async function* (
    options: BuildAngularLibraryExecutorOptions,
    context: ExecutorContext
  ) {
    const { target, dependencies } = calculateProjectDependencies(
      readCachedProjectGraph(),
      context.root,
      context.projectName,
      context.targetName,
      context.configurationName
    );
    if (
      !checkDependentProjectsHaveBeenBuilt(
        context.root,
        context.projectName,
        context.targetName,
        dependencies
      )
    ) {
      return Promise.resolve({ success: false });
    }

    function updatePackageJson(): void {
      if (
        dependencies.length > 0 &&
        options.updateBuildableProjectDepsInPackageJson
      ) {
        updateBuildableProjectPackageJsonDependencies(
          context.root,
          context.projectName,
          context.targetName,
          context.configurationName,
          target,
          dependencies,
          options.buildableProjectDepsInPackageJsonType
        );
      }
    }

    if (options.watch) {
      return yield* eachValueFrom(
        from(initializeNgPackagr(options, context, dependencies)).pipe(
          switchMap((packagr) => packagr.watch()),
          tap(() => updatePackageJson()),
          mapTo({ success: true })
        )
      );
    }

    return from(initializeNgPackagr(options, context, dependencies))
      .pipe(
        switchMap((packagr) => packagr.build()),
        tap(() => updatePackageJson()),
        mapTo({ success: true })
      )
      .toPromise();
  };
}

export const packageExecutor = createLibraryExecutor(initializeNgPackagr);

export default packageExecutor;
