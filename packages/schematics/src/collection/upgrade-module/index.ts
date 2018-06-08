import {
  apply,
  branchAndMerge,
  chain,
  mergeWith,
  move,
  noop,
  Rule,
  SchematicContext,
  template,
  Tree,
  url
} from '@angular-devkit/schematics';

import { names, toClassName, toFileName } from '../../utils/name-utils';
import * as path from 'path';
import {
  addDeclarationToModule,
  addEntryComponents,
  addImportToModule,
  addMethod,
  addParameterToConstructor,
  getBootstrapComponent,
  insert,
  readBootstrapInfo,
  removeFromNgModule
} from '../../utils/ast-utils';
import { insertImport } from '@schematics/angular/utility/route-utils';
import { Schema } from './schema';
import { addUpgradeToPackageJson } from '../../utils/common';
import { formatFiles } from '../../utils/rules/format-files';

function addImportsToModule(options: Schema): Rule {
  return (host: Tree) => {
    const { moduleClassName, modulePath, moduleSource } = readBootstrapInfo(
      host,
      options.project
    );

    insert(host, modulePath, [
      insertImport(
        moduleSource,
        modulePath,
        `configure${toClassName(options.name)}, upgradedComponents`,
        `../${toFileName(options.name)}-setup`
      ),
      insertImport(
        moduleSource,
        modulePath,
        'UpgradeModule',
        '@angular/upgrade/static'
      ),
      ...addImportToModule(moduleSource, modulePath, 'UpgradeModule'),
      ...addDeclarationToModule(
        moduleSource,
        modulePath,
        '...upgradedComponents'
      ),
      ...addEntryComponents(
        moduleSource,
        modulePath,
        getBootstrapComponent(moduleSource, moduleClassName)
      )
    ]);

    return host;
  };
}

function addNgDoBootstrapToModule(options: Schema): Rule {
  return (host: Tree) => {
    const { moduleClassName, modulePath, moduleSource } = readBootstrapInfo(
      host,
      options.project
    );

    insert(host, modulePath, [
      ...addParameterToConstructor(moduleSource, modulePath, {
        className: moduleClassName,
        param: 'private upgrade: UpgradeModule'
      }),
      ...addMethod(moduleSource, modulePath, {
        className: moduleClassName,
        methodHeader: 'ngDoBootstrap(): void',
        body: `
configure${toClassName(options.name)}(this.upgrade.injector);
this.upgrade.bootstrap(document.body, ['downgraded', '${options.name}']);
        `
      }),
      ...removeFromNgModule(moduleSource, modulePath, 'bootstrap')
    ]);

    return host;
  };
}

function createFiles(angularJsImport: string, options: Schema): Rule {
  return (host: Tree, context: SchematicContext) => {
    const {
      moduleClassName,
      mainPath,
      moduleSpec,
      bootstrapComponentClassName,
      bootstrapComponentFileName
    } = readBootstrapInfo(host, options.project);

    const dir = path.dirname(mainPath);
    const templateSource = apply(url('./files'), [
      template({
        ...options,
        tmpl: '',
        moduleFileName: moduleSpec,
        moduleClassName,
        angularJsImport,
        angularJsModule: options.name,
        bootstrapComponentClassName,
        bootstrapComponentFileName,
        ...names(options.name)
      }),
      move(dir)
    ]);
    const r = branchAndMerge(chain([mergeWith(templateSource)]));
    return r(host, context);
  };
}

export default function(options: Schema): Rule {
  const angularJsImport = options.angularJsImport
    ? options.angularJsImport
    : options.name;

  return chain([
    createFiles(angularJsImport, options),
    addImportsToModule(options),
    addNgDoBootstrapToModule(options),
    options.skipPackageJson ? noop() : addUpgradeToPackageJson(),
    formatFiles(options)
  ]);
}
