import { Tree } from '@nrwl/devkit';
import { createTreeWithEmptyWorkspace } from '@nrwl/devkit/testing';
import { moveGenerator } from './move';
import { libraryGenerator } from '../library/library';

describe('move', () => {
  let tree: Tree;
  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
  });

  it('should update jest config when moving down directories', async () => {
    await libraryGenerator(tree, { name: 'my-lib' });

    await moveGenerator(tree, {
      projectName: 'my-lib',
      importPath: '@proj/shared-mylib',
      updateImportPath: true,
      destination: 'shared/my-lib-new',
    });
    const jestConfigPath = 'libs/shared/my-lib-new/jest.config.ts';
    const afterJestConfig = tree.read(jestConfigPath, 'utf-8');
    expect(tree.exists(jestConfigPath)).toBeTruthy();
    expect(afterJestConfig).toContain("preset: '../../../jest.preset.ts'");
    expect(afterJestConfig).toContain(
      "coverageDirectory: '../../../coverage/libs/shared/my-lib-new'"
    );
  });

  it('should update jest config when moving up directories', async () => {
    await libraryGenerator(tree, { name: 'shared/my-lib' });

    await moveGenerator(tree, {
      projectName: 'shared-my-lib',
      importPath: '@proj/mylib',
      updateImportPath: true,
      destination: 'my-lib-new',
    });
    const jestConfigPath = 'libs/my-lib-new/jest.config.ts';
    const afterJestConfig = tree.read(jestConfigPath, 'utf-8');
    expect(tree.exists(jestConfigPath)).toBeTruthy();
    expect(afterJestConfig).toContain("preset: '../../jest.preset.ts'");
    expect(afterJestConfig).toContain(
      "coverageDirectory: '../../coverage/libs/my-lib-new'"
    );
  });
});
