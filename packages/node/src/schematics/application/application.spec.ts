import { Tree, VirtualTree } from '@angular-devkit/schematics';
import * as stripJsonComments from 'strip-json-comments';
import { createEmptyWorkspace, getFileContent } from '@nrwl/workspace/testing';
import { runSchematic } from '../../utils/testing';
import { NxJson, readJsonInTree } from '@nrwl/workspace';
import { createApp } from '../../../../angular/src/utils/testing';

describe('app', () => {
  let appTree: Tree;

  beforeEach(() => {
    appTree = new VirtualTree();
    appTree = createEmptyWorkspace(appTree);
  });

  describe('not nested', () => {
    it('should update angular.json', async () => {
      const tree = await runSchematic('app', { name: 'myNodeApp' }, appTree);
      const angularJson = readJsonInTree(tree, '/angular.json');
      const project = angularJson.projects['my-node-app'];
      expect(project.root).toEqual('apps/my-node-app');
      expect(project.architect).toEqual(
        jasmine.objectContaining({
          build: {
            builder: '@nrwl/node:build',
            options: {
              outputPath: 'dist/apps/my-node-app',
              main: 'apps/my-node-app/src/main.ts',
              tsConfig: 'apps/my-node-app/tsconfig.app.json',
              assets: ['apps/my-node-app/src/assets']
            },
            configurations: {
              production: {
                optimization: true,
                extractLicenses: true,
                inspect: false,
                fileReplacements: [
                  {
                    replace: 'apps/my-node-app/src/environments/environment.ts',
                    with:
                      'apps/my-node-app/src/environments/environment.prod.ts'
                  }
                ]
              }
            }
          },
          serve: {
            builder: '@nrwl/node:execute',
            options: {
              buildTarget: 'my-node-app:build'
            }
          }
        })
      );
      expect(angularJson.projects['my-node-app-e2e']).toBeUndefined();
    });

    it('should update nx.json', async () => {
      const tree = await runSchematic(
        'app',
        { name: 'myNodeApp', tags: 'one,two' },
        appTree
      );
      const nxJson = readJsonInTree<NxJson>(tree, '/nx.json');
      expect(nxJson).toEqual({
        npmScope: 'proj',
        projects: {
          'my-node-app': {
            tags: ['one', 'two']
          }
        }
      });
    });

    it('should generate files', async () => {
      const tree = await runSchematic('app', { name: 'myNodeApp' }, appTree);
      expect(tree.exists(`apps/my-node-app/jest.config.js`)).toBeTruthy();
      expect(tree.exists('apps/my-node-app/src/main.ts')).toBeTruthy();

      const tsconfig = readJsonInTree(tree, 'apps/my-node-app/tsconfig.json');
      expect(tsconfig.extends).toEqual('../../tsconfig.json');
      expect(tsconfig.compilerOptions.types).toContain('node');
      expect(tsconfig.compilerOptions.types).toContain('jest');

      const tsconfigApp = JSON.parse(
        stripJsonComments(
          getFileContent(tree, 'apps/my-node-app/tsconfig.app.json')
        )
      );
      expect(tsconfigApp.compilerOptions.outDir).toEqual(
        '../../dist/out-tsc/apps/my-node-app'
      );
      expect(tsconfigApp.extends).toEqual('./tsconfig.json');

      const tslintJson = JSON.parse(
        stripJsonComments(getFileContent(tree, 'apps/my-node-app/tslint.json'))
      );
      expect(tslintJson.extends).toEqual('../../tslint.json');
    });
  });

  describe('nested', () => {
    it('should update angular.json', async () => {
      const tree = await runSchematic(
        'app',
        { name: 'myNodeApp', directory: 'myDir' },
        appTree
      );
      const angularJson = readJsonInTree(tree, '/angular.json');

      expect(angularJson.projects['my-dir-my-node-app'].root).toEqual(
        'apps/my-dir/my-node-app'
      );
      expect(angularJson.projects['my-dir-my-node-app-e2e']).toBeUndefined();
    });

    it('should update nx.json', async () => {
      const tree = await runSchematic(
        'app',
        { name: 'myNodeApp', directory: 'myDir', tags: 'one,two' },
        appTree
      );
      const nxJson = readJsonInTree<NxJson>(tree, '/nx.json');
      expect(nxJson).toEqual({
        npmScope: 'proj',
        projects: {
          'my-dir-my-node-app': {
            tags: ['one', 'two']
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
        { name: 'myNodeApp', directory: 'myDir' },
        appTree
      );

      // Make sure these exist
      [
        `apps/my-dir/my-node-app/jest.config.js`,
        'apps/my-dir/my-node-app/src/main.ts'
      ].forEach(path => {
        expect(tree.exists(path)).toBeTruthy();
      });

      // Make sure these have properties
      [
        {
          path: 'apps/my-dir/my-node-app/tsconfig.json',
          lookupFn: json => json.extends,
          expectedValue: '../../../tsconfig.json'
        },
        {
          path: 'apps/my-dir/my-node-app/tsconfig.app.json',
          lookupFn: json => json.compilerOptions.outDir,
          expectedValue: '../../../dist/out-tsc/apps/my-dir/my-node-app'
        },
        {
          path: 'apps/my-dir/my-node-app/tsconfig.app.json',
          lookupFn: json => json.compilerOptions.types,
          expectedValue: ['node']
        },
        {
          path: 'apps/my-dir/my-node-app/tslint.json',
          lookupFn: json => json.extends,
          expectedValue: '../../../tslint.json'
        }
      ].forEach(hasJsonValue);
    });
  });

  describe('--unit-test-runner none', () => {
    it('should not generate test configuration', async () => {
      const tree = await runSchematic(
        'app',
        { name: 'myNodeApp', unitTestRunner: 'none' },
        appTree
      );
      expect(tree.exists('apps/my-node-app/src/test-setup.ts')).toBeFalsy();
      expect(tree.exists('apps/my-node-app/src/test.ts')).toBeFalsy();
      expect(tree.exists('apps/my-node-app/tsconfig.spec.json')).toBeFalsy();
      expect(tree.exists('apps/my-node-app/jest.config.js')).toBeFalsy();
      const angularJson = readJsonInTree(tree, 'angular.json');
      expect(
        angularJson.projects['my-node-app'].architect.test
      ).toBeUndefined();
      expect(
        angularJson.projects['my-node-app'].architect.lint.options.tsConfig
      ).toEqual(['apps/my-node-app/tsconfig.app.json']);
    });
  });

  describe('frontendProject', () => {
    it('should configure proxy', async () => {
      appTree = createApp(appTree, 'my-frontend');

      const tree = await runSchematic(
        'app',
        { name: 'myNodeApp', frontendProject: 'my-frontend' },
        appTree
      );

      expect(tree.exists('apps/my-frontend/proxy.conf.json')).toBeTruthy();
      const serve = JSON.parse(tree.readContent('angular.json')).projects[
        'my-frontend'
      ].architect.serve;
      expect(serve.options.proxyConfig).toEqual(
        'apps/my-frontend/proxy.conf.json'
      );
    });

    it('should work with unnormalized project names', async () => {
      appTree = createApp(appTree, 'myFrontend');

      const tree = await runSchematic(
        'app',
        { name: 'myNodeApp', frontendProject: 'myFrontend' },
        appTree
      );

      expect(tree.exists('apps/my-frontend/proxy.conf.json')).toBeTruthy();
      const serve = JSON.parse(tree.readContent('angular.json')).projects[
        'my-frontend'
      ].architect.serve;
      expect(serve.options.proxyConfig).toEqual(
        'apps/my-frontend/proxy.conf.json'
      );
    });
  });
});
