import { Tree } from '@angular-devkit/schematics';
import { runSchematic } from '../../utils/testing';
import { createEmptyWorkspace } from '@nrwl/workspace/testing';

describe('preset', () => {
  let projectTree: Tree;

  beforeEach(() => {
    projectTree = createEmptyWorkspace(Tree.empty());
  });

  it('should create files (preset = angular)', async () => {
    const tree = await runSchematic(
      'preset',
      { name: 'proj', preset: 'angular' },
      projectTree
    );
    expect(tree.exists('/apps/proj/src/app/app.component.ts')).toBe(true);

    expect(
      JSON.parse(tree.readContent('/workspace.json')).cli.defaultCollection
    ).toBe('@nrwl/angular');
  });

  it('should create files (preset = react)', async () => {
    const tree = await runSchematic(
      'preset',
      { name: 'proj', preset: 'react' },
      projectTree
    );
    expect(tree.exists('/apps/proj/src/main.tsx')).toBe(true);
    expect(
      JSON.parse(tree.readContent('/workspace.json')).cli.defaultCollection
    ).toBe('@nrwl/react');
  });

  it('should create files (preset = web-components)', async () => {
    const tree = await runSchematic(
      'preset',
      { name: 'proj', preset: 'web-components' },
      projectTree
    );
    expect(tree.exists('/apps/proj/src/main.ts')).toBe(true);
    expect(
      JSON.parse(tree.readContent('/workspace.json')).cli.defaultCollection
    ).toBe('@nrwl/web');
  });

  describe('--preset angular-nest', () => {
    it('should create files', async () => {
      const tree = await runSchematic(
        'preset',
        { name: 'proj', preset: 'angular-nest' },
        projectTree
      );
      expect(tree.exists('/apps/proj/src/app/app.component.ts')).toBe(true);
      expect(tree.exists('/apps/api/src/app/app.controller.ts')).toBe(true);
      expect(
        tree.exists('/libs/api-interfaces/src/lib/api-interfaces.ts')
      ).toBe(true);
    });

    it('should work with unnormalized names', async () => {
      const tree = await runSchematic(
        'preset',
        { name: 'myProj', preset: 'angular-nest' },
        projectTree
      );

      expect(tree.exists('/apps/my-proj/src/app/app.component.ts')).toBe(true);
      expect(tree.exists('/apps/api/src/app/app.controller.ts')).toBe(true);
      expect(
        tree.exists('/libs/api-interfaces/src/lib/api-interfaces.ts')
      ).toBe(true);
    });
  });

  describe('--preset react-express', () => {
    it('should create files', async () => {
      const tree = await runSchematic(
        'preset',
        { name: 'proj', preset: 'react-express' },
        projectTree
      );
      expect(tree.exists('/apps/proj/src/app/app.tsx')).toBe(true);
      expect(
        tree.exists('/libs/api-interfaces/src/lib/api-interfaces.ts')
      ).toBe(true);
    });

    it('should work with unnormalized names', async () => {
      const tree = await runSchematic(
        'preset',
        { name: 'myProj', preset: 'react-express' },
        projectTree
      );

      expect(tree.exists('/apps/my-proj/src/app/app.tsx')).toBe(true);
      expect(
        tree.exists('/libs/api-interfaces/src/lib/api-interfaces.ts')
      ).toBe(true);
    });
  });
});
