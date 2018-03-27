import {
  apply,
  branchAndMerge,
  chain,
  mergeWith,
  move,
  noop,
  Rule,
  template,
  Tree,
  url
} from '@angular-devkit/schematics';

import {
  names,
  toClassName,
  toFileName,
  toPropertyName
} from '../../utils/name-utils';
import * as path from 'path';
import * as ts from 'typescript';
import {
  addImportToModule,
  addProviderToModule,
  insert,
  updateJson
} from '../../utils/ast-utils';
import { insertImport } from '@schematics/angular/utility/route-utils';
import { Schema } from './schema';
import {
  ngrxVersion,
  routerStoreVersion,
  ngrxStoreFreezeVersion
} from '../../lib-versions';
import { wrapIntoFormat } from '../../utils/tasks';

function addImportsToModule(name: string, options: Schema): Rule {
  return (host: Tree) => {
    if (options.onlyAddFiles) {
      return host;
    }

    if (!host.exists(options.module)) {
      throw new Error('Specified module does not exist');
    }

    const modulePath = options.module;

    const sourceText = host.read(modulePath)!.toString('utf-8');
    const source = ts.createSourceFile(
      modulePath,
      sourceText,
      ts.ScriptTarget.Latest,
      true
    );

    if (options.onlyEmptyRoot) {
      insert(host, modulePath, [
        insertImport(source, modulePath, 'StoreModule', '@ngrx/store'),
        insertImport(source, modulePath, 'EffectsModule', '@ngrx/effects'),
        insertImport(
          source,
          modulePath,
          'StoreDevtoolsModule',
          '@ngrx/store-devtools'
        ),
        insertImport(
          source,
          modulePath,
          'environment',
          '../environments/environment'
        ),
        insertImport(
          source,
          modulePath,
          'StoreRouterConnectingModule',
          '@ngrx/router-store'
        ),
        insertImport(source, modulePath, 'storeFreeze', 'ngrx-store-freeze'),
        ...addImportToModule(
          source,
          modulePath,
          `StoreModule.forRoot({},{metaReducers: !environment.production ? [storeFreeze] : []})`
        ),
        ...addImportToModule(source, modulePath, `EffectsModule.forRoot([])`),
        ...addImportToModule(
          source,
          modulePath,
          `!environment.production ? StoreDevtoolsModule.instrument() : []`
        ),
        ...addImportToModule(source, modulePath, `StoreRouterConnectingModule`)
      ]);
      return host;
    } else {
      const reducerPath = `./${toFileName(options.directory)}/${toFileName(
        name
      )}.reducer`;
      const effectsPath = `./${toFileName(options.directory)}/${toFileName(
        name
      )}.effects`;
      const initPath = `./${toFileName(options.directory)}/${toFileName(
        name
      )}.init`;

      const reducerName = `${toPropertyName(name)}Reducer`;
      const effectsName = `${toClassName(name)}Effects`;
      const initName = `${toPropertyName(name)}InitialState`;

      const common = [
        insertImport(source, modulePath, 'StoreModule', '@ngrx/store'),
        insertImport(source, modulePath, 'EffectsModule', '@ngrx/effects'),
        insertImport(source, modulePath, reducerName, reducerPath),
        insertImport(source, modulePath, initName, initPath),
        insertImport(source, modulePath, effectsName, effectsPath),
        ...addProviderToModule(source, modulePath, effectsName)
      ];

      if (options.root) {
        insert(host, modulePath, [
          ...common,
          insertImport(
            source,
            modulePath,
            'StoreDevtoolsModule',
            '@ngrx/store-devtools'
          ),
          insertImport(
            source,
            modulePath,
            'environment',
            '../environments/environment'
          ),
          insertImport(
            source,
            modulePath,
            'StoreRouterConnectingModule',
            '@ngrx/router-store'
          ),
          insertImport(source, modulePath, 'storeFreeze', 'ngrx-store-freeze'),
          ...addImportToModule(
            source,
            modulePath,
            `StoreModule.forRoot({${toPropertyName(name)}: ${reducerName}}, {
              initialState: {${toPropertyName(name)}: ${initName}},
              metaReducers: !environment.production ? [storeFreeze] : []
            })`
          ),
          ...addImportToModule(
            source,
            modulePath,
            `EffectsModule.forRoot([${effectsName}])`
          ),
          ...addImportToModule(
            source,
            modulePath,
            `!environment.production ? StoreDevtoolsModule.instrument() : []`
          ),
          ...addImportToModule(
            source,
            modulePath,
            `StoreRouterConnectingModule`
          )
        ]);
      } else {
        insert(host, modulePath, [
          ...common,
          ...addImportToModule(
            source,
            modulePath,
            `StoreModule.forFeature('${toPropertyName(
              name
            )}', ${reducerName}, {initialState: ${initName}})`
          ),
          ...addImportToModule(
            source,
            modulePath,
            `EffectsModule.forFeature([${effectsName}])`
          )
        ]);
      }

      return host;
    }
  };
}

function addNgRxToPackageJson(): Rule {
  return updateJson('package.json', packageJson => {
    if (!packageJson['dependencies']) {
      packageJson['dependencies'] = {};
    }

    if (!packageJson['dependencies']['@ngrx/store']) {
      packageJson['dependencies']['@ngrx/store'] = ngrxVersion;
    }
    if (!packageJson['dependencies']['@ngrx/router-store']) {
      packageJson['dependencies']['@ngrx/router-store'] = routerStoreVersion;
    }
    if (!packageJson['dependencies']['@ngrx/effects']) {
      packageJson['dependencies']['@ngrx/effects'] = ngrxVersion;
    }
    if (!packageJson['dependencies']['@ngrx/store-devtools']) {
      packageJson['dependencies']['@ngrx/store-devtools'] = ngrxVersion;
    }
    if (!packageJson['dependencies']['ngrx-store-freeze']) {
      packageJson['dependencies']['ngrx-store-freeze'] = ngrxStoreFreezeVersion;
    }
    return packageJson;
  });
}

export default function(schema: Schema): Rule {
  return wrapIntoFormat(() => {
    const options = normalizeOptions(schema);
    const name = options.name;
    const moduleDir = path.dirname(options.module);

    if (options.onlyEmptyRoot) {
      return chain([
        addImportsToModule(name, options),
        options.skipPackageJson ? noop() : addNgRxToPackageJson()
      ]);
    } else {
      const templateSource = apply(url('./files'), [
        template({ ...options, tmpl: '', ...names(name) }),
        move(moduleDir)
      ]);
      return chain([
        branchAndMerge(chain([mergeWith(templateSource)])),
        addImportsToModule(name, options),
        options.skipPackageJson ? noop() : addNgRxToPackageJson()
      ]);
    }
  });
}

function normalizeOptions(options: Schema): Schema {
  return { ...options, directory: toFileName(options.directory) };
}
