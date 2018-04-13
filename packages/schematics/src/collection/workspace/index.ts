import {
  apply,
  branchAndMerge,
  chain,
  mergeWith,
  Rule,
  Tree,
  url,
  SchematicContext
} from '@angular-devkit/schematics';
import { Schema } from './schema';
import * as path from 'path';
import { join } from 'path';
import {
  angularCliSchema,
  angularCliVersion,
  latestMigration,
  ngrxVersion,
  ngrxStoreFreezeVersion,
  nxVersion,
  prettierVersion,
  routerStoreVersion,
  schematicsVersion
} from '../../lib-versions';
import * as fs from 'fs';
import { updateJsonFile } from '../../utils/fileutils';
import {
  resolveUserExistingPrettierConfig,
  DEFAULT_NRWL_PRETTIER_CONFIG
} from '../../utils/common';
import { Observable } from 'rxjs/Observable';
import { fromPromise } from 'rxjs/observable/fromPromise';
import { tap, map } from 'rxjs/operators';
import { toFileName } from '../../utils/name-utils';
import {
  updateJsonInTree,
  getAngularCliConfig,
  insert
} from '../../utils/ast-utils';
import { stripIndents } from '@angular-devkit/core/src/utils/literals';
import { InsertChange } from '@schematics/angular/utility/change';

function updatePackageJson() {
  return updateJsonInTree('package.json', packageJson => {
    if (!packageJson.devDependencies) {
      packageJson.devDependencies = {};
    }
    if (!packageJson.dependencies) {
      packageJson.dependencies = {};
    }
    if (!packageJson.scripts) {
      packageJson.scripts = {};
    }
    if (!packageJson.dependencies['@nrwl/nx']) {
      packageJson.dependencies['@nrwl/nx'] = nxVersion;
    }
    if (!packageJson.dependencies['@ngrx/store']) {
      packageJson.dependencies['@ngrx/store'] = ngrxVersion;
    }
    if (!packageJson.dependencies['@ngrx/router-store']) {
      packageJson.dependencies['@ngrx/router-store'] = routerStoreVersion;
    }
    if (!packageJson.dependencies['@ngrx/effects']) {
      packageJson.dependencies['@ngrx/effects'] = ngrxVersion;
    }
    if (!packageJson.dependencies['@ngrx/store-devtools']) {
      packageJson.dependencies['@ngrx/store-devtools'] = ngrxVersion;
    }
    if (!packageJson.dependencies['ngrx-store-freeze']) {
      packageJson.dependencies['ngrx-store-freeze'] = ngrxStoreFreezeVersion;
    }
    if (!packageJson.devDependencies['@nrwl/schematics']) {
      packageJson.devDependencies['@nrwl/schematics'] = schematicsVersion;
    }
    if (!packageJson.dependencies['@angular/cli']) {
      packageJson.dependencies['@angular/cli'] = angularCliVersion;
    }
    if (!packageJson.devDependencies['prettier']) {
      packageJson.devDependencies['prettier'] = prettierVersion;
    }

    packageJson.scripts['affected:apps'] =
      './node_modules/.bin/nx affected:apps';
    packageJson.scripts['affected:build'] =
      './node_modules/.bin/nx affected:build';
    packageJson.scripts['affected:e2e'] = './node_modules/.bin/nx affected:e2e';

    packageJson.scripts['affected:dep-graph'] =
      './node_modules/.bin/nx affected:dep-graph';

    packageJson.scripts['format'] = './node_modules/.bin/nx format:write';
    packageJson.scripts['format:write'] = './node_modules/.bin/nx format:write';
    packageJson.scripts['format:check'] = './node_modules/.bin/nx format:check';

    packageJson.scripts['update'] = './node_modules/.bin/nx update';
    packageJson.scripts['update:check'] = './node_modules/.bin/nx update:check';
    packageJson.scripts['update:skip'] = './node_modules/.bin/nx update:skip';

    packageJson.scripts['lint'] = './node_modules/.bin/nx lint && ng lint';

    packageJson.scripts['dep-graph'] = './node_modules/.bin/nx dep-graph';

    packageJson.scripts['postinstall'] = './node_modules/.bin/nx postinstall';
    packageJson.scripts['workspace-schematic'] =
      './node_modules/.bin/nx workspace-schematic';

    return packageJson;
  });
}

function updateAngularCLIJson(options: Schema): Rule {
  return updateJsonInTree('.angular-cli.json', angularCliJson => {
    angularCliJson.$schema = angularCliSchema;
    angularCliJson.project.npmScope = npmScope(options);
    angularCliJson.project.latestMigration = latestMigration;

    if (angularCliJson.apps.length !== 1) {
      throw new Error('Can only convert projects with one app');
    }

    const app = angularCliJson.apps[0];
    app.name = options.name;
    app.root = path.join('apps', options.name, app.root);
    app.outDir = path.join('dist', 'apps', options.name);
    app.test = '../../../test.js';
    app.testTsconfig = '../../../tsconfig.spec.json';
    app.scripts = app.scripts.map(p => path.join('../../', p));
    app.tags = [];
    if (!angularCliJson.defaults) {
      angularCliJson.defaults = {};
    }
    if (!angularCliJson.defaults.schematics) {
      angularCliJson.defaults.schematics = {};
    }
    angularCliJson.defaults.schematics['collection'] = '@nrwl/schematics';
    angularCliJson.defaults.schematics['postGenerate'] = 'npm run format';
    angularCliJson.defaults.schematics['newProject'] = ['app', 'lib'];

    angularCliJson.lint = [
      {
        project: `${app.root}/tsconfig.app.json`,
        exclude: '**/node_modules/**'
      },
      {
        project: './tsconfig.spec.json',
        exclude: '**/node_modules/**'
      },
      {
        project: join('apps', options.name, 'e2e', 'tsconfig.e2e.json'),
        exclude: '**/node_modules/**'
      }
    ];

    return angularCliJson;
  });
}

function updateTsConfig(options: Schema): Rule {
  return updateJsonInTree('tsconfig.json', tsConfigJson =>
    setUpCompilerOptions(tsConfigJson, npmScope(options), '')
  );
}

function updateTsConfigsJson(options: Schema) {
  return (host: Tree) => {
    const angularCliJson = getAngularCliConfig(host);
    const app = angularCliJson.apps[0];

    // This has to stay using fs since it is created with fs
    const offset = '../../../';
    updateJsonFile(`${app.root}/tsconfig.app.json`, json => {
      json.extends = `${offset}tsconfig.json`;
      json.compilerOptions.outDir = `${offset}dist/out-tsc/apps/${
        options.name
      }`;
      if (!json.exclude) json.exclude = [];
      json.exclude = dedup(json.exclude.concat(['**/*.spec.ts']));

      if (!json.include) json.include = [];
      json.include = dedup(json.include.concat(['**/*.ts']));
    });

    // This has to stay using fs since it is created with fs
    updateJsonFile('tsconfig.spec.json', json => {
      json.extends = './tsconfig.json';
      json.compilerOptions.outDir = `./dist/out-tsc/spec`;

      if (!json.exclude) json.exclude = [];
      json.files = ['test.js'];
      json.include = ['**/*.ts'];
      json.exclude = dedup(
        json.exclude.concat([
          '**/e2e/*.ts',
          '**/*.e2e-spec.ts',
          '**/*.po.ts',
          'node_modules',
          'tmp'
        ])
      );
    });

    // This has to stay using fs since it is created with fs
    updateJsonFile(`apps/${options.name}/e2e/tsconfig.e2e.json`, json => {
      json.extends = `${offset}tsconfig.json`;
      json.compilerOptions.outDir = `${offset}dist/out-tsc/e2e/${options.name}`;
      if (!json.exclude) json.exclude = [];
      json.exclude = dedup(json.exclude.concat(['**/*.spec.ts']));

      if (!json.include) json.include = [];
      json.include = dedup(json.include.concat(['../**/*.ts']));
    });

    return host;
  };
}

function updateTsLint() {
  return updateJsonInTree('tslint.json', tslintJson => {
    [
      'no-trailing-whitespace',
      'one-line',
      'quotemark',
      'typedef-whitespace',
      'whitespace'
    ].forEach(key => {
      tslintJson[key] = undefined;
    });
    tslintJson.rulesDirectory = tslintJson.rulesDirectory || [];
    tslintJson.rulesDirectory.push('node_modules/@nrwl/schematics/src/tslint');
    tslintJson['nx-enforce-module-boundaries'] = [
      true,
      {
        allow: [],
        depConstraints: [{ sourceTag: '*', onlyDependOnLibsWithTags: ['*'] }]
      }
    ];
    return tslintJson;
  });
}

function npmScope(options: Schema): string {
  return options && options.npmScope ? options.npmScope : options.name;
}

function updateKarmaConf() {
  return (host: Tree, context: SchematicContext) => {
    const angularCliJson = getAngularCliConfig(host);

    const karmaConfig = angularCliJson.test!.karma;

    if (!karmaConfig) {
      return;
    }

    const karmaConfPath = karmaConfig.config;

    const contents = host.read(karmaConfPath).toString();

    const change = new InsertChange(
      karmaConfPath,
      contents.indexOf('module.exports ='),
      stripIndents`
        const { makeSureNoAppIsSelected } = require('@nrwl/schematics/src/utils/cli-config-utils');
        // Nx only supports running unit tests for all apps and libs.
        makeSureNoAppIsSelected();
      ` + '\n\n'
    );

    insert(host, karmaConfPath, [change]);

    return host;
  };
}

function updateProtractorConf() {
  return (host: Tree) => {
    if (!host.exists('protractor.conf.js')) {
      throw new Error('Cannot find protractor.conf.js');
    }
    const protractorConf = host.read('protractor.conf.js')!.toString('utf-8');
    const updatedConf = protractorConf
      .replace(`'./e2e/**/*.e2e-spec.ts'`, `appDir + '/e2e/**/*.e2e-spec.ts'`)
      .replace(`'e2e/tsconfig.e2e.json'`, `appDir + '/e2e/tsconfig.e2e.json'`)
      .replace(
        `exports.config = {`,
        `
const { getAppDirectoryUsingCliConfig } = require('@nrwl/schematics/src/utils/cli-config-utils');
const appDir = getAppDirectoryUsingCliConfig();
exports.config = {
`
      );

    host.overwrite('protractor.conf.js', updatedConf);

    return host;
  };
}

function setUpCompilerOptions(
  tsconfig: any,
  npmScope: string,
  offset: string
): any {
  if (!tsconfig.compilerOptions.paths) {
    tsconfig.compilerOptions.paths = {};
  }
  tsconfig.compilerOptions.baseUrl = '.';
  tsconfig.compilerOptions.paths[`@${npmScope}/*`] = [`${offset}libs/*`];

  return tsconfig;
}

function moveExistingFiles(options: Schema) {
  return (host: Tree) => {
    const angularCliJson = getAngularCliConfig(host);
    const app = angularCliJson.apps[0];

    fs.mkdirSync('apps');
    fs.mkdirSync('libs');
    fs.unlinkSync(path.join(app.root, app.test));
    fs.mkdirSync(path.join('apps', options.name));
    fs.renameSync(path.join(app.root, app.testTsconfig), 'tsconfig.spec.json');
    fs.renameSync(app.root, join('apps', options.name, app.root));
    fs.renameSync('e2e', join('apps', options.name, 'e2e'));

    return host;
  };
}

function createAdditionalFiles(options: Schema) {
  return (host: Tree): Observable<Tree> => {
    // if the user does not already have a prettier configuration
    // of any kind, create one
    return fromPromise(resolveUserExistingPrettierConfig()).pipe(
      tap(resolvedExistingConfig => {
        if (!resolvedExistingConfig) {
          fs.writeFileSync(
            '.prettierrc',
            JSON.stringify(DEFAULT_NRWL_PRETTIER_CONFIG, null, 2)
          );
        }
      }),
      map(() => host)
    );
  };
}

function dedup(array: any[]): any[] {
  const res = [];

  array.forEach(a => {
    if (res.indexOf(a) === -1) {
      res.push(a);
    }
  });
  return res;
}

function checkCanConvertToWorkspace(options: Schema) {
  return (host: Tree) => {
    if (!host.exists('package.json')) {
      throw new Error('Cannot find package.json');
    }
    if (!host.exists('protractor.conf.js')) {
      throw new Error('Cannot find protractor.conf.js');
    }
    const angularCliJson = getAngularCliConfig(host);
    if (angularCliJson.apps.length !== 1) {
      throw new Error('Can only convert projects with one app');
    }
    return host;
  };
}

export default function(schema: Schema): Rule {
  const options = { ...schema, name: toFileName(schema.name) };
  return chain([
    checkCanConvertToWorkspace(options),
    moveExistingFiles(options),
    createAdditionalFiles(options),
    branchAndMerge(chain([mergeWith(apply(url('./files'), []))])),
    updatePackageJson(),
    updateAngularCLIJson(options),
    updateTsLint(),
    updateTsConfig(options),
    updateTsConfigsJson(options),
    updateKarmaConf(),
    updateProtractorConf()
  ]);
}
