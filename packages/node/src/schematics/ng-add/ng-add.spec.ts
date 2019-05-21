import { Tree } from '@angular-devkit/schematics';
import { createEmptyWorkspace } from '@nrwl/workspace/testing';
import { readJsonInTree, updateJsonInTree } from '@nrwl/workspace';
import { callRule, runSchematic } from '../../utils/testing';

describe('ng-add', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = Tree.empty();
    tree = createEmptyWorkspace(tree);
  });

  it('should add dependencies', async () => {
    const result = await runSchematic('ng-add', {}, tree);
    const packageJson = readJsonInTree(result, 'package.json');
    expect(packageJson.dependencies['@nrwl/node']).toBeUndefined();
    expect(packageJson.devDependencies['@nrwl/node']).toBeDefined();
  });

  describe('defaultCollection', () => {
    it('should be set if none was set before', async () => {
      const result = await runSchematic('ng-add', {}, tree);
      const angularJson = readJsonInTree(result, 'angular.json');
      expect(angularJson.cli.defaultCollection).toEqual('@nrwl/node');
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
      expect(angularJson.cli.defaultCollection).toEqual('@nrwl/node');
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
