import { SchematicTestRunner } from '@angular-devkit/schematics/testing';
import * as path from 'path';
import { Tree, VirtualTree } from '@angular-devkit/schematics';
import {
  createEmptyWorkspace,
  runSchematic,
  schematicRunner
} from '../../utils/testing-utils';
import { getFileContent } from '@schematics/angular/utility/test';
import * as stripJsonComments from 'strip-json-comments';
import { readJsonInTree, updateJsonInTree } from '../../utils/ast-utils';
import { NxJson } from '../../command-line/shared';
import { Framework } from '../../utils/frameworks';

describe('app', () => {
  let appTree: Tree;

  beforeEach(() => {
    appTree = new VirtualTree();
    appTree = createEmptyWorkspace(appTree);
  });

  describe('not nested', () => {
    it('should update angular.json', async () => {
      const tree = await runSchematic('app', { name: 'myApp' }, appTree);
      const angularJson = readJsonInTree(tree, '/angular.json');

      expect(angularJson.projects['my-app'].root).toEqual('apps/my-app/');
      expect(angularJson.projects['my-app-e2e'].root).toEqual(
        'apps/my-app-e2e'
      );
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
      expect(tree.exists(`apps/my-app/jest.config.js`)).toBeTruthy();
      expect(tree.exists('apps/my-app/src/main.ts')).toBeTruthy();
      expect(tree.exists('apps/my-app/src/app/app.module.ts')).toBeTruthy();
      expect(tree.exists('apps/my-app/src/app/app.component.ts')).toBeTruthy();
      expect(
        getFileContent(tree, 'apps/my-app/src/app/app.module.ts')
      ).toContain('class AppModule');

      const tsconfig = readJsonInTree(tree, 'apps/my-app/tsconfig.json');
      expect(tsconfig.extends).toEqual('../../tsconfig.json');
      expect(tsconfig.compilerOptions.types).toContain('jest');

      const tsconfigApp = JSON.parse(
        stripJsonComments(getFileContent(tree, 'apps/my-app/tsconfig.app.json'))
      );
      expect(tsconfigApp.compilerOptions.outDir).toEqual(
        '../../dist/out-tsc/apps/my-app'
      );
      expect(tsconfigApp.extends).toEqual('./tsconfig.json');

      const tslintJson = JSON.parse(
        stripJsonComments(getFileContent(tree, 'apps/my-app/tslint.json'))
      );
      expect(tslintJson.extends).toEqual('../../tslint.json');

      expect(tree.exists('apps/my-app-e2e/cypress.json')).toBeTruthy();
      const tsconfigE2E = JSON.parse(
        stripJsonComments(
          getFileContent(tree, 'apps/my-app-e2e/tsconfig.e2e.json')
        )
      );
      // expect(tsconfigE2E.compilerOptions.outDir).toEqual(
      //   '../../dist/out-tsc/apps/my-app-e2e'
      // );
      expect(tsconfigE2E.extends).toEqual('./tsconfig.json');
    });

    it('should default the prefix to npmScope', async () => {
      const noPrefix = await runSchematic(
        'app',
        { name: 'myApp', e2eTestRunner: 'protractor' },
        appTree
      );
      const withPrefix = await runSchematic(
        'app',
        { name: 'myApp', prefix: 'custom', e2eTestRunner: 'protractor' },
        appTree
      );

      // Testing without prefix

      let appE2eSpec = noPrefix
        .read('apps/my-app-e2e/src/app.e2e-spec.ts')
        .toString();
      let angularJson = JSON.parse(noPrefix.read('angular.json').toString());
      let myAppPrefix = angularJson.projects['my-app'].prefix;

      expect(myAppPrefix).toEqual('proj');
      expect(appE2eSpec).toContain('Welcome to my-app!');

      // Testing WITH prefix

      appE2eSpec = withPrefix
        .read('apps/my-app-e2e/src/app.e2e-spec.ts')
        .toString();
      angularJson = JSON.parse(withPrefix.read('angular.json').toString());
      myAppPrefix = angularJson.projects['my-app'].prefix;

      expect(myAppPrefix).toEqual('custom');
      expect(appE2eSpec).toContain('Welcome to my-app!');
    });

    xit('should work if the new project root is changed', async () => {
      appTree = await schematicRunner
        .callRule(
          updateJsonInTree('/angular.json', json => ({
            ...json,
            newProjectRoot: 'newProjectRoot'
          })),
          appTree
        )
        .toPromise();

      const result = await runSchematic('app', { name: 'myApp' }, appTree);
      expect(result.exists('apps/my-app/src/main.ts')).toEqual(true);
      expect(result.exists('apps/my-app-e2e/protractor.conf.js')).toEqual(true);
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
        'apps/my-dir/my-app/'
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
        const content = getFileContent(tree, path);
        const config = JSON.parse(stripJsonComments(content));

        expect(lookupFn(config)).toEqual(expectedValue);
      };
      const tree = await runSchematic(
        'app',
        { name: 'myApp', directory: 'myDir' },
        appTree
      );

      const appModulePath = 'apps/my-dir/my-app/src/app/app.module.ts';
      expect(getFileContent(tree, appModulePath)).toContain('class AppModule');

      // Make sure these exist
      [
        `apps/my-dir/my-app/jest.config.js`,
        'apps/my-dir/my-app/src/main.ts',
        'apps/my-dir/my-app/src/app/app.module.ts',
        'apps/my-dir/my-app/src/app/app.component.ts',
        'apps/my-dir/my-app-e2e/cypress.json'
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
          expectedValue: '../../../dist/out-tsc/apps/my-dir/my-app'
        },
        {
          path: 'apps/my-dir/my-app-e2e/tsconfig.json',
          lookupFn: json => json.extends,
          expectedValue: '../../../tsconfig.json'
        },
        // {
        //   path: 'apps/my-dir/my-app-e2e/tsconfig.e2e.json',
        //   lookupFn: json => json.compilerOptions.outDir,
        //   expectedValue: '../../../dist/out-tsc/apps/my-dir/my-app-e2e'
        // },
        {
          path: 'apps/my-dir/my-app/tslint.json',
          lookupFn: json => json.extends,
          expectedValue: '../../../tslint.json'
        }
      ].forEach(hasJsonValue);
    });
  });

  describe('routing', () => {
    it('should include RouterTestingModule', async () => {
      const tree = await runSchematic(
        'app',
        { name: 'myApp', directory: 'myDir', routing: true },
        appTree
      );
      expect(
        getFileContent(tree, 'apps/my-dir/my-app/src/app/app.module.ts')
      ).toContain('RouterModule.forRoot');
      expect(
        getFileContent(tree, 'apps/my-dir/my-app/src/app/app.component.spec.ts')
      ).toContain('imports: [RouterTestingModule]');
    });

    it('should not modify tests when --skip-tests is set', async () => {
      const tree = await runSchematic(
        'app',
        { name: 'myApp', directory: 'myDir', routing: true, skipTests: true },
        appTree
      );
      expect(
        tree.exists('apps/my-dir/my-app/src/app/app.component.spec.ts')
      ).toBeFalsy();
    });
  });

  describe('template generation mode', () => {
    it('should create Nx specific `app.component.html` template', async () => {
      const tree = await runSchematic(
        'app',
        { name: 'myApp', directory: 'myDir' },
        appTree
      );
      expect(
        getFileContent(tree, 'apps/my-dir/my-app/src/app/app.component.html')
      ).toBeTruthy();
      expect(
        getFileContent(tree, 'apps/my-dir/my-app/src/app/app.component.html')
      ).toContain('This is an Angular app built with');
    });

    it("should update `template`'s property of AppComponent with Nx content", async () => {
      const tree = await runSchematic(
        'app',
        { name: 'myApp', directory: 'myDir', inlineTemplate: true },
        appTree
      );
      expect(
        getFileContent(tree, 'apps/my-dir/my-app/src/app/app.component.ts')
      ).toContain('This is an Angular app built with');
    });
  });

  describe('--style scss', () => {
    it('should generate scss styles', async () => {
      const result = await runSchematic(
        'app',
        { name: 'myApp', style: 'scss' },
        appTree
      );
      expect(result.exists('apps/my-app/src/app/app.component.scss')).toEqual(
        true
      );
    });

    it('should set it as default', async () => {
      const result = await runSchematic(
        'app',
        { name: 'myApp', style: 'scss' },
        appTree
      );
      const angularJson = readJsonInTree(result, 'angular.json');

      expect(angularJson.projects['my-app'].schematics).toEqual({
        '@nrwl/schematics:component': {
          style: 'scss'
        }
      });
    });
  });

  describe('--unit-test-runner karma', () => {
    it('should generate a karma config', async () => {
      const tree = await runSchematic(
        'app',
        { name: 'myApp', unitTestRunner: 'karma' },
        appTree
      );

      expect(tree.exists('apps/my-app/tsconfig.spec.json')).toBeTruthy();
      expect(tree.exists('apps/my-app/karma.conf.js')).toBeTruthy();
      const angularJson = readJsonInTree(tree, 'angular.json');
      expect(angularJson.projects['my-app'].architect.test.builder).toEqual(
        '@angular-devkit/build-angular:karma'
      );
      expect(
        angularJson.projects['my-app'].architect.lint.options.tsConfig
      ).toEqual([
        'apps/my-app/tsconfig.app.json',
        'apps/my-app/tsconfig.spec.json'
      ]);
      const tsconfigAppJson = readJsonInTree(
        tree,
        'apps/my-app/tsconfig.app.json'
      );
      expect(tsconfigAppJson.exclude).toEqual(['src/test.ts', '**/*.spec.ts']);
      expect(tsconfigAppJson.compilerOptions.outDir).toEqual(
        '../../dist/out-tsc/apps/my-app'
      );
    });
  });

  describe('--framework', () => {
    describe('web-components', () => {
      it('should replace app files', async () => {
        const tree = await runSchematic(
          'app',
          { name: 'myApp', framework: Framework.WebComponents },
          appTree
        );

        expect(tree.exists('apps/my-app/src/main.ts')).toBeTruthy();
        expect(tree.exists('apps/my-app/src/app/app.component.ts')).toBeFalsy();
        expect(
          tree.exists('apps/my-app/src/app/app.component.css')
        ).toBeFalsy();
        expect(
          tree.exists('apps/my-app/src/app/app.component.html')
        ).toBeFalsy();
        expect(
          tree.exists('apps/my-app/src/app/app.component.spec.ts')
        ).toBeFalsy();
      });
    });

    describe('react', () => {
      it('should replace app files', async () => {
        const tree = await runSchematic(
          'app',
          {
            name: 'my-App',
            framework: Framework.React
          },
          appTree
        );

        expect(tree.exists('apps/my-app/src/main.ts')).toBeFalsy();
        expect(tree.exists('apps/my-app/src/app/app.component.ts')).toBeFalsy();
        expect(
          tree.exists('apps/my-app/src/app/app.component.css')
        ).toBeFalsy();
        expect(
          tree.exists('apps/my-app/src/app/app.component.html')
        ).toBeFalsy();
        expect(
          tree.exists('apps/my-app/src/app/app.component.spec.ts')
        ).toBeFalsy();
        expect(tree.exists('apps/my-app/src/main.tsx')).toBeTruthy();
        expect(tree.exists('apps/my-app/src/app/app.tsx')).toBeTruthy();
        expect(tree.exists('apps/my-app/src/app/app.spec.tsx')).toBeTruthy();
        expect(tree.exists('apps/my-app/src/app/app.css')).toBeTruthy();
      });

      it('should setup jest with tsx support', async () => {
        const tree = await runSchematic(
          'app',
          {
            name: 'my-App',
            framework: Framework.React
          },
          appTree
        );

        expect(tree.readContent('apps/my-app/jest.config.js')).toContain(
          `moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'html'],`
        );
      });

      it('should setup jest without serializers', async () => {
        const tree = await runSchematic(
          'app',
          {
            name: 'my-App',
            framework: Framework.React
          },
          appTree
        );

        expect(tree.readContent('apps/my-app/jest.config.js')).not.toContain(
          `'jest-preset-angular/AngularSnapshotSerializer.js',`
        );
      });

      it('should remove the extract-i18n target', async () => {
        const tree = await runSchematic(
          'app',
          {
            name: 'my-App',
            framework: Framework.React
          },
          appTree
        );
        const angularJson = readJsonInTree(tree, 'angular.json');
        const architectConfig = angularJson.projects['my-app'].architect;
        expect(architectConfig['extract-i18n']).not.toBeDefined();
      });

      it('should setup the nrwl web build builder', async () => {
        const tree = await runSchematic(
          'app',
          {
            name: 'my-App',
            framework: Framework.React
          },
          appTree
        );
        const angularJson = readJsonInTree(tree, 'angular.json');
        const architectConfig = angularJson.projects['my-app'].architect;
        expect(architectConfig.build.builder).toEqual(
          '@nrwl/builders:web-build'
        );
        expect(architectConfig.build.options).toEqual({
          assets: ['apps/my-app/src/favicon.ico', 'apps/my-app/src/assets'],
          index: 'apps/my-app/src/index.html',
          main: 'apps/my-app/src/main.tsx',
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
            name: 'my-App',
            framework: Framework.React
          },
          appTree
        );
        const angularJson = readJsonInTree(tree, 'angular.json');
        const architectConfig = angularJson.projects['my-app'].architect;
        expect(architectConfig.serve.builder).toEqual(
          '@nrwl/builders:web-dev-server'
        );
        expect(architectConfig.serve.options).toEqual({
          buildTarget: 'my-app:build'
        });
        expect(architectConfig.serve.configurations.production).toEqual({
          buildTarget: 'my-app:build:production'
        });
      });
    });
  });

  describe('--unit-test-runner none', () => {
    it('should not generate test configuration', async () => {
      const tree = await runSchematic(
        'app',
        { name: 'myApp', unitTestRunner: 'none' },
        appTree
      );
      expect(tree.exists('apps/my-app/src/test-setup.ts')).toBeFalsy();
      expect(tree.exists('apps/my-app/src/test.ts')).toBeFalsy();
      expect(tree.exists('apps/my-app/tsconfig.spec.json')).toBeFalsy();
      expect(tree.exists('apps/my-app/jest.config.js')).toBeFalsy();
      expect(tree.exists('apps/my-app/karma.config.js')).toBeFalsy();
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

  describe('replaceAppNameWithPath', () => {
    it('should protect `angular.json` commands and properties', async () => {
      const tree = await runSchematic('app', { name: 'ui' }, appTree);
      const angularJson = readJsonInTree(tree, 'angular.json');
      expect(angularJson.projects['ui']).toBeDefined();
      expect(
        angularJson.projects['ui']['architect']['build']['builder']
      ).toEqual('@angular-devkit/build-angular:browser');
    });

    it('should protect `angular.json` sensible properties value to be renamed', async () => {
      const tree = await runSchematic(
        'app',
        { name: 'ui', prefix: 'ui' },
        appTree
      );
      const angularJson = readJsonInTree(tree, 'angular.json');
      expect(angularJson.projects['ui'].prefix).toEqual('ui');
    });
  });
});
