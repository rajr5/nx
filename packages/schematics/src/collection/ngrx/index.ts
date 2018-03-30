import {
  apply,
  branchAndMerge,
  chain,
  externalSchematic,
  mergeWith,
  move,
  noop,
  Rule,
  template,
  url
} from '@angular-devkit/schematics';
import { Tree } from '@angular-devkit/schematics';

import { Schema } from './schema';
import * as path from 'path';

import { names, toFileName } from '../../utils/name-utils';
import { wrapIntoFormat } from '../../utils/tasks';

import {
  RequestContext,
  updateNgrxReducers,
  updateNgrxActions,
  updateNgrxEffects,
  addImportsToModule,
  addNgRxToPackageJson
} from './rules';
import { deleteFile } from '../../utils/rules/deleteFile';

/**
 * Rule to generate the Nx 'ngrx' Collection
 */
export default function generateNgrxCollection(_options: Schema): Rule {
  return wrapIntoFormat((host: Tree) => {
    const options = normalizeOptions(_options);
    const context: RequestContext = {
      featureName: options.name,
      moduleDir: path.dirname(options.module),
      options,
      host
    };

    return chain([
      branchAndMerge(generateNgrxFiles(context)),
      branchAndMerge(generateNxFiles(context)),

      addImportsToModule(context),

      updateNgrxActions(context),
      updateNgrxReducers(context),
      updateNgrxEffects(context),

      options.skipPackageJson ? noop() : addNgRxToPackageJson()
    ]);
  });
}

// ********************************************************
// Internal Function
// ********************************************************

/**
 * Generate the Nx files that are NOT created by the @ngrx/schematic(s)
 */
function generateNxFiles(context: RequestContext) {
  const templateSource = apply(url('./files'), [
    template({ ...context.options, tmpl: '', ...names(context.featureName) }),
    move(context.moduleDir)
  ]);
  return chain([mergeWith(templateSource)]);
}

/**
 * Using @ngrx/schematics, generate scaffolding for 'feature': action, reducer, effect files
 */
function generateNgrxFiles(context: RequestContext) {
  const filePrefix = `app/${context.featureName}/${context.featureName}`;

  return chain([
    externalSchematic('@ngrx/schematics', 'feature', {
      name: context.featureName,
      sourceDir: './',
      flat: false
    }),
    deleteFile(`/${filePrefix}.effects.spec.ts`),
    deleteFile(`/${filePrefix}.reducer.spec.ts`),
    moveToNxMonoTree(
      context.featureName,
      context.moduleDir,
      context.options.directory
    )
  ]);
}

/**
 * @ngrx/schematics generates files in:
 *    `/apps/<ngrxFeatureName>/`
 *
 * For Nx monorepo, however, we need to move the files to either
 *  a) apps/<appName>/src/app/<directory>, or
 *  b) libs/<libName>/src/<directory>
 */
function moveToNxMonoTree(
  ngrxFeatureName: string,
  nxDir: string,
  directory: string
): Rule {
  return move(`app/${ngrxFeatureName}`, path.join(nxDir, directory));
}

/**
 * Extract the parent 'directory' for the specified
 */
function normalizeOptions(options: Schema): Schema {
  return { ...options, directory: toFileName(options.directory) };
}
