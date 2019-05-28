import { Tree } from '@angular-devkit/schematics';
import { createEmptyWorkspace } from '@nrwl/workspace/testing';
import * as stripJsonComments from 'strip-json-comments';
import { readJsonInTree, NxJson } from '@nrwl/workspace';
import { runSchematic } from '../../utils/testing';

describe('app', () => {
  let appTree: Tree;

  beforeEach(() => {
    appTree = Tree.empty();
    appTree = createEmptyWorkspace(appTree);
  });

  describe('not nested', () => {
    it('should update angular.json', async () => {
      const tree = await runSchematic('app', { name: 'myApp' }, appTree);
      const angularJson = readJsonInTree(tree, '/angular.json');

      expect(angularJson.projects['my-app'].root).toEqual('apps/my-app');
      expect(angularJson.projects['my-app-e2e'].root).toEqual(
        'apps/my-app-e2e'
      );
      expect(angularJson.defaultProject).toEqual('my-app');
    });

    it('should update nx.json', async () => {
      const tree = await runSchematic(
        'app',
        { name: 'myApp', tags: 'one,two' },
        appTree
      );
      const nxJson = readJsonInTree<NxJson>(tree, '/nx.json');
      expect(nxJson).toEqual({
        npmScope: 'proj',
        projects: {
          'my-app': {
            tags: ['one', 'two']
          },
          'my-app-e2e': {
            tags: []
          }
        }
      });
    });

    it('should generate files', async () => {
      const tree = await runSchematic('app', { name: 'myApp' }, appTree);
      expect(tree.exists('apps/my-app/src/main.ts')).toBeTruthy();
      expect(tree.exists('apps/my-app/src/app/app.element.ts')).toBeTruthy();
      expect(
        tree.exists('apps/my-app/src/app/app.element.spec.ts')
      ).toBeTruthy();
      expect(tree.exists('apps/my-app/src/app/app.element.css')).toBeTruthy();

      const tsconfig = readJsonInTree(tree, 'apps/my-app/tsconfig.json');
      expect(tsconfig.extends).toEqual('../../tsconfig.json');
      expect(tsconfig.compilerOptions.types).toContain('jest');

      const tsconfigApp = JSON.parse(
        stripJsonComments(tree.readContent('apps/my-app/tsconfig.app.json'))
      );
      expect(tsconfigApp.compilerOptions.outDir).toEqual('../../dist/out-tsc');
      expect(tsconfigApp.extends).toEqual('./tsconfig.json');

      const tslintJson = JSON.parse(
        stripJsonComments(tree.readContent('apps/my-app/tslint.json'))
      );
      expect(tslintJson.extends).toEqual('../../tslint.json');

      expect(tree.exists('apps/my-app-e2e/cypress.json')).toBeTruthy();
      const tsconfigE2E = JSON.parse(
        stripJsonComments(tree.readContent('apps/my-app-e2e/tsconfig.e2e.json'))
      );
      expect(tsconfigE2E.compilerOptions.outDir).toEqual('../../dist/out-tsc');
      expect(tsconfigE2E.extends).toEqual('./tsconfig.json');
    });
  });

  describe('nested', () => {
    it('should update angular.json', async () => {
      const tree = await runSchematic(
        'app',
        { name: 'myApp', directory: 'myDir' },
        appTree
      );
      const angularJson = readJsonInTree(tree, '/angular.json');

      expect(angularJson.projects['my-dir-my-app'].root).toEqual(
        'apps/my-dir/my-app'
      );
      expect(angularJson.projects['my-dir-my-app-e2e'].root).toEqual(
        'apps/my-dir/my-app-e2e'
      );
    });

    it('should update nx.json', async () => {
      const tree = await runSchematic(
        'app',
        { name: 'myApp', directory: 'myDir', tags: 'one,two' },
        appTree
      );
      const nxJson = readJsonInTree<NxJson>(tree, '/nx.json');
      expect(nxJson).toEqual({
        npmScope: 'proj',
        projects: {
          'my-dir-my-app': {
            tags: ['one', 'two']
          },
          'my-dir-my-app-e2e': {
            tags: []
          }
        }
      });
    });

    it('should generate files', async () => {
      const hasJsonValue = ({ path, expectedValue, lookupFn }) => {
        const content = tree.readContent(path);
        const config = JSON.parse(stripJsonComments(content));

        expect(lookupFn(config)).toEqual(expectedValue);
      };
      const tree = await runSchematic(
        'app',
        { name: 'myApp', directory: 'myDir' },
        appTree
      );

      // Make sure these exist
      [
        'apps/my-dir/my-app/src/main.ts',
        'apps/my-dir/my-app/src/app/app.element.ts',
        'apps/my-dir/my-app/src/app/app.element.spec.ts',
        'apps/my-dir/my-app/src/app/app.element.css'
      ].forEach(path => {
        expect(tree.exists(path)).toBeTruthy();
      });

      // Make sure these have properties
      [
        {
          path: 'apps/my-dir/my-app/tsconfig.json',
          lookupFn: json => json.extends,
          expectedValue: '../../../tsconfig.json'
        },
        {
          path: 'apps/my-dir/my-app/tsconfig.app.json',
          lookupFn: json => json.compilerOptions.outDir,
          expectedValue: '../../../dist/out-tsc'
        },
        {
          path: 'apps/my-dir/my-app-e2e/tsconfig.json',
          lookupFn: json => json.extends,
          expectedValue: '../../../tsconfig.json'
        },
        {
          path: 'apps/my-dir/my-app-e2e/tsconfig.e2e.json',
          lookupFn: json => json.compilerOptions.outDir,
          expectedValue: '../../../dist/out-tsc'
        },
        {
          path: 'apps/my-dir/my-app/tslint.json',
          lookupFn: json => json.extends,
          expectedValue: '../../../tslint.json'
        }
      ].forEach(hasJsonValue);
    });
  });

  it('should create Nx specific template', async () => {
    const tree = await runSchematic(
      'app',
      { name: 'myApp', directory: 'myDir' },
      appTree
    );
    expect(
      tree.readContent('apps/my-dir/my-app/src/app/app.element.ts')
    ).toBeTruthy();
    expect(
      tree.readContent('apps/my-dir/my-app/src/app/app.element.ts')
    ).toContain('This is a Web Components app built with');
  });

  describe('--style scss', () => {
    it('should generate scss styles', async () => {
      const result = await runSchematic(
        'app',
        { name: 'myApp', style: 'scss' },
        appTree
      );
      expect(result.exists('apps/my-app/src/app/app.element.scss')).toEqual(
        true
      );
    });
  });

  it('should setup jest without serializers', async () => {
    const tree = await runSchematic(
      'app',
      {
        name: 'my-App'
      },
      appTree
    );

    expect(tree.readContent('apps/my-app/jest.config.js')).not.toContain(
      `'jest-preset-angular/AngularSnapshotSerializer.js',`
    );
  });

  it('should setup the nrwl web build builder', async () => {
    const tree = await runSchematic(
      'app',
      {
        name: 'my-App'
      },
      appTree
    );
    const angularJson = readJsonInTree(tree, 'angular.json');
    const architectConfig = angularJson.projects['my-app'].architect;
    expect(architectConfig.build.builder).toEqual('@nrwl/web:build');
    expect(architectConfig.build.options).toEqual({
      assets: ['apps/my-app/src/favicon.ico', 'apps/my-app/src/assets'],
      index: 'apps/my-app/src/index.html',
      main: 'apps/my-app/src/main.ts',
      outputPath: 'dist/apps/my-app',
      polyfills: 'apps/my-app/src/polyfills.ts',
      scripts: [],
      styles: ['apps/my-app/src/styles.css'],
      tsConfig: 'apps/my-app/tsconfig.app.json'
    });
    expect(architectConfig.build.configurations.production).toEqual({
      optimization: true,
      budgets: [
        {
          maximumError: '5mb',
          maximumWarning: '2mb',
          type: 'initial'
        }
      ],
      extractCss: true,
      extractLicenses: true,
      fileReplacements: [
        {
          replace: 'apps/my-app/src/environments/environment.ts',
          with: 'apps/my-app/src/environments/environment.prod.ts'
        }
      ],
      namedChunks: false,
      outputHashing: 'all',
      sourceMap: false,
      vendorChunk: false
    });
  });

  it('should setup the nrwl web dev server builder', async () => {
    const tree = await runSchematic(
      'app',
      {
        name: 'my-App'
      },
      appTree
    );
    const angularJson = readJsonInTree(tree, 'angular.json');
    const architectConfig = angularJson.projects['my-app'].architect;
    expect(architectConfig.serve.builder).toEqual('@nrwl/web:dev-server');
    expect(architectConfig.serve.options).toEqual({
      buildTarget: 'my-app:build'
    });
    expect(architectConfig.serve.configurations.production).toEqual({
      buildTarget: 'my-app:build:production'
    });
  });

  it('should setup the tslint builder', async () => {
    const tree = await runSchematic(
      'app',
      {
        name: 'my-App'
      },
      appTree
    );
    const angularJson = readJsonInTree(tree, 'angular.json');
    expect(angularJson.projects['my-app'].architect.lint).toEqual({
      builder: '@angular-devkit/build-angular:tslint',
      options: {
        exclude: ['**/node_modules/**'],
        tsConfig: [
          'apps/my-app/tsconfig.app.json',
          'apps/my-app/tsconfig.spec.json'
        ]
      }
    });
  });

  describe('--prefix', () => {
    it('should use the prefix in the index.html', async () => {
      const tree = await runSchematic(
        'app',
        { name: 'myApp', prefix: 'prefix' },
        appTree
      );

      expect(tree.readContent('apps/my-app/src/index.html')).toContain(
        '<prefix-root></prefix-root>'
      );
    });
  });

  describe('--unit-test-runner none', () => {
    it('should not generate test configuration', async () => {
      const tree = await runSchematic(
        'app',
        { name: 'myApp', unitTestRunner: 'none' },
        appTree
      );
      expect(tree.exists('apps/my-app/src/app/app.spec.ts')).toBeFalsy();
      expect(tree.exists('apps/my-app/tsconfig.spec.json')).toBeFalsy();
      expect(tree.exists('apps/my-app/jest.config.js')).toBeFalsy();
      const angularJson = readJsonInTree(tree, 'angular.json');
      expect(angularJson.projects['my-app'].architect.test).toBeUndefined();
      expect(
        angularJson.projects['my-app'].architect.lint.options.tsConfig
      ).toEqual(['apps/my-app/tsconfig.app.json']);
    });
  });

  describe('--e2e-test-runner none', () => {
    it('should not generate test configuration', async () => {
      const tree = await runSchematic(
        'app',
        { name: 'myApp', e2eTestRunner: 'none' },
        appTree
      );
      expect(tree.exists('apps/my-app-e2e')).toBeFalsy();
      const angularJson = readJsonInTree(tree, 'angular.json');
      expect(angularJson.projects['my-app-e2e']).toBeUndefined();
    });
  });
});
