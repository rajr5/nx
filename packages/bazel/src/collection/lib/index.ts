import {
  apply,
  branchAndMerge,
  chain,
  mergeWith,
  noop,
  Rule,
  template,
  Tree,
  url
} from '@angular-devkit/schematics';
import { insertImport } from '@schematics/angular/utility/route-utils';
import * as path from 'path';
import * as ts from 'typescript';

import {
  addGlobal,
  addImportToModule,
  addIncludeToTsConfig,
  addReexport,
  addRoute,
  insert
} from '../../utils/ast-utils';
import { offsetFromRoot } from '../../utils/common';
import { addApp, cliConfig, serializeJson } from '../../utils/fileutils';
import {
  names,
  toClassName,
  toFileName,
  toPropertyName
} from '../../utils/name-utils';
import { wrapIntoFormat } from '../../utils/tasks';
import { Schema } from './schema';

interface NormalizedSchema extends Schema {
  name: string;
  fullName: string;
  fullPath: string;
  tags?: string;
}

function normalizeOptions(options: Schema): NormalizedSchema {
  const name = toFileName(options.name);
  const fullName = options.directory
    ? `${toFileName(options.directory)}/${name}`
    : name;
  const fullPath = `libs/${fullName}/src`;
  return { ...options, sourceDir: 'src', name, fullName, fullPath };
}

function addLibToAngularCliJson(options: NormalizedSchema): Rule {
  return (host: Tree) => {
    const tags = options.tags ? options.tags.split(',').map(s => s.trim()) : [];
    const json = cliConfig(host);
    json.apps = addApp(json.apps, {
      name: options.fullName,
      root: options.fullPath,
      test: `${offsetFromRoot(options.fullPath)}test.js`,
      appRoot: '',
      tags
    });

    host.overwrite('.angular-cli.json', serializeJson(json));
    return host;
  };
}

function addLazyLoadedRouterConfiguration(modulePath: string): Rule {
  return (host: Tree) => {
    const moduleSource = host.read(modulePath)!.toString('utf-8');
    const sourceFile = ts.createSourceFile(
      modulePath,
      moduleSource,
      ts.ScriptTarget.Latest,
      true
    );
    insert(host, modulePath, [
      insertImport(sourceFile, modulePath, 'RouterModule', '@angular/router'),
      ...addImportToModule(
        sourceFile,
        modulePath,
        `
        RouterModule.forChild([ 
        /* {path: '', pathMatch: 'full', component: InsertYourComponentHere} */ 
       ]) `
      )
    ]);
    return host;
  };
}

function addRouterConfiguration(
  schema: NormalizedSchema,
  indexFilePath: string,
  moduleFileName: string,
  modulePath: string
): Rule {
  return (host: Tree) => {
    const indexSource = host.read(indexFilePath)!.toString('utf-8');
    const indexSourceFile = ts.createSourceFile(
      indexFilePath,
      indexSource,
      ts.ScriptTarget.Latest,
      true
    );
    const moduleSource = host.read(modulePath)!.toString('utf-8');
    const moduleSourceFile = ts.createSourceFile(
      modulePath,
      moduleSource,
      ts.ScriptTarget.Latest,
      true
    );
    const constName = `${toPropertyName(schema.name)}Routes`;

    insert(host, modulePath, [
      insertImport(
        moduleSourceFile,
        modulePath,
        'RouterModule, Route',
        '@angular/router'
      ),
      ...addImportToModule(moduleSourceFile, modulePath, `RouterModule`),
      ...addGlobal(
        moduleSourceFile,
        modulePath,
        `export const ${constName}: Route[] = [];`
      )
    ]);
    insert(host, indexFilePath, [
      ...addReexport(indexSourceFile, indexFilePath, moduleFileName, constName)
    ]);
    return host;
  };
}

function addLoadChildren(schema: NormalizedSchema): Rule {
  return (host: Tree) => {
    const json = cliConfig(host);

    const moduleSource = host.read(schema.parentModule)!.toString('utf-8');
    const sourceFile = ts.createSourceFile(
      schema.parentModule,
      moduleSource,
      ts.ScriptTarget.Latest,
      true
    );

    const loadChildren = `@${json.project.npmScope}/${toFileName(
      schema.fullName
    )}#${toClassName(schema.name)}Module`;
    insert(host, schema.parentModule, [
      ...addRoute(
        schema.parentModule,
        sourceFile,
        `{path: '${toFileName(schema.name)}', loadChildren: '${loadChildren}'}`
      )
    ]);

    const tsConfig = findClosestTsConfigApp(host, schema.parentModule);
    if (tsConfig) {
      const tsConfigAppSource = host.read(tsConfig)!.toString('utf-8');
      const tsConfigAppFile = ts.createSourceFile(
        tsConfig,
        tsConfigAppSource,
        ts.ScriptTarget.Latest,
        true
      );
      const offset = offsetFromRoot(path.dirname(tsConfig));
      insert(host, tsConfig, [
        ...addIncludeToTsConfig(
          tsConfig,
          tsConfigAppFile,
          `\n    , "${offset}libs/${schema.fullName}/index.ts"\n`
        )
      ]);

      const e2e = `${path.dirname(
        path.dirname(tsConfig)
      )}/e2e/tsconfig.e2e.json`;
      if (host.exists(e2e)) {
        const tsConfigE2ESource = host.read(e2e)!.toString('utf-8');
        const tsConfigE2EFile = ts.createSourceFile(
          e2e,
          tsConfigE2ESource,
          ts.ScriptTarget.Latest,
          true
        );
        insert(host, e2e, [
          ...addIncludeToTsConfig(
            e2e,
            tsConfigE2EFile,
            `\n    , "${offset}libs/${schema.fullName}/index.ts"\n`
          )
        ]);
      }
    } else {
      // we should warn the user about not finding the config
    }

    return host;
  };
}

function findClosestTsConfigApp(
  host: Tree,
  parentModule: string
): string | null {
  const dir = path.parse(parentModule).dir;
  if (host.exists(`${dir}/tsconfig.app.json`)) {
    return `${dir}/tsconfig.app.json`;
  } else if (dir != '') {
    return findClosestTsConfigApp(host, dir);
  } else {
    return null;
  }
}

function addChildren(schema: NormalizedSchema): Rule {
  return (host: Tree) => {
    const json = cliConfig(host);

    const moduleSource = host.read(schema.parentModule)!.toString('utf-8');
    const sourceFile = ts.createSourceFile(
      schema.parentModule,
      moduleSource,
      ts.ScriptTarget.Latest,
      true
    );
    const constName = `${toPropertyName(schema.name)}Routes`;
    const importPath = `@${json.project.npmScope}/${toFileName(
      schema.fullName
    )}`;

    insert(host, schema.parentModule, [
      insertImport(sourceFile, schema.parentModule, constName, importPath),
      ...addRoute(
        schema.parentModule,
        sourceFile,
        `{path: '${toFileName(schema.name)}', children: ${constName}}`
      )
    ]);
    return host;
  };
}

function validateLibSchema(schema) {
  const options = normalizeOptions(schema);
  const moduleFileName = `${toFileName(options.name)}.module`;
  const modulePath = `${options.fullPath}/${moduleFileName}.ts`;
  const indexFile = `libs/${toFileName(options.fullName)}/index.ts`;

  if (options.routing && options.nomodule) {
    throw new Error(`nomodule and routing cannot be used together`);
  }

  if (!options.routing && options.lazy) {
    throw new Error(`routing must be set`);
  }

  const routingRules: Array<Rule> = [
    options.routing && options.lazy
      ? addLazyLoadedRouterConfiguration(modulePath)
      : noop(),
    options.routing && options.lazy && options.parentModule
      ? addLoadChildren(options)
      : noop(),

    options.routing && !options.lazy
      ? addRouterConfiguration(options, indexFile, moduleFileName, modulePath)
      : noop(),
    options.routing && !options.lazy && options.parentModule
      ? addChildren(options)
      : noop()
  ];

  const templateSource = apply(
    url(options.nomodule ? './files' : './ngfiles'),
    [
      template({
        ...names(options.name),
        dot: '.',
        tmpl: '',
        ...(options as object)
      })
    ]
  );

  return {
    options,
    moduleFileName,
    modulePath,
    indexFile,
    templateSource,
    routingRules
  };
}

export default function(schema: Schema): Rule {
  return wrapIntoFormat(() => {
    const { templateSource, routingRules } = validateLibSchema(schema);

    return chain([
      branchAndMerge(chain([mergeWith(templateSource)])),
      ...routingRules
    ]);
  });
}
