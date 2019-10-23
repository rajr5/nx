import { Tree } from '@angular-devkit/schematics';
import { readJsonInTree } from '@nrwl/workspace';
import { createTestUILib, runSchematic } from '../../utils/testing';

describe('schematic:cypress-project', () => {
  let appTree: Tree;

  beforeEach(async () => {
    appTree = await createTestUILib('test-ui-lib');
  });

  it('should generate files', async () => {
    const tree = await runSchematic(
      'cypress-project',
      { name: 'test-ui-lib' },
      appTree
    );

    expect(tree.exists('apps/test-ui-lib-e2e/cypress.json')).toBeTruthy();
    const cypressJson = readJsonInTree(
      tree,
      'apps/test-ui-lib-e2e/cypress.json'
    );
    expect(cypressJson.baseUrl).toBe('http://localhost:4400');
  });

  it('should update `angular.json` file', async () => {
    const tree = await runSchematic(
      'cypress-project',
      { name: 'test-ui-lib' },
      appTree
    );
    const angularJson = readJsonInTree(tree, 'angular.json');
    const project = angularJson.projects['test-ui-lib-e2e'];

    expect(project.architect.e2e.options.devServerTarget).toEqual(
      'test-ui-lib:storybook'
    );
    expect(project.architect.e2e.options.headless).toEqual(false);
    expect(project.architect.e2e.options.watch).toEqual(true);
    expect(
      project.architect.e2e.configurations.headless.devServerTarget
    ).toEqual('test-ui-lib:storybook:ci');
    expect(project.architect.e2e.configurations.headless.headless).toEqual(
      true
    );
  });
});
