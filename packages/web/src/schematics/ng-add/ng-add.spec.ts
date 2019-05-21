import { Tree } from '@angular-devkit/schematics';
import { createEmptyWorkspace } from '@nrwl/workspace/testing';
import { readJsonInTree } from '@nrwl/workspace';
import { callRule, runSchematic } from '../../utils/testing';
import { updateJsonInTree } from '@nrwl/workspace/src/utils/ast-utils';

describe('ng-add', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = Tree.empty();
    tree = createEmptyWorkspace(tree);
  });

  it('should add web dependencies', async () => {
    const result = await runSchematic('ng-add', {}, tree);
    const packageJson = readJsonInTree(result, 'package.json');
    expect(packageJson.dependencies['@nrwl/web']).toBeUndefined();
    expect(packageJson.dependencies['document-register-element']).toBeDefined();
    expect(packageJson.devDependencies['@nrwl/web']).toBeDefined();
  });

  describe('defaultCollection', () => {
    it('should be set if none was set before', async () => {
      const result = await runSchematic('ng-add', {}, tree);
      const angularJson = readJsonInTree(result, 'angular.json');
      expect(angularJson.cli.defaultCollection).toEqual('@nrwl/web');
    });

    it('should be set if @nrwl/workspace was set before', async () => {
      tree = await callRule(
        updateJsonInTree('angular.json', json => {
          json.cli = {
            defaultCollection: '@nrwl/workspace'
          };

          return json;
        }),
        tree
      );
      const result = await runSchematic('ng-add', {}, tree);
      const angularJson = readJsonInTree(result, 'angular.json');
      expect(angularJson.cli.defaultCollection).toEqual('@nrwl/web');
    });

    it('should not be set if something else was set before', async () => {
      tree = await callRule(
        updateJsonInTree('angular.json', json => {
          json.cli = {
            defaultCollection: '@nrwl/angular'
          };

          return json;
        }),
        tree
      );
      const result = await runSchematic('ng-add', {}, tree);
      const angularJson = readJsonInTree(result, 'angular.json');
      expect(angularJson.cli.defaultCollection).toEqual('@nrwl/angular');
    });
  });
});
