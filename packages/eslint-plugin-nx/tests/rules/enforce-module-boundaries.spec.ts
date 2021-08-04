import type { ProjectGraph } from '@nrwl/devkit';
import {
  DependencyType,
  ProjectType,
} from '@nrwl/workspace/src/core/project-graph';
import { TSESLint } from '@typescript-eslint/experimental-utils';
import * as parser from '@typescript-eslint/parser';
import { vol } from 'memfs';
import { extname } from 'path';
import enforceModuleBoundaries, {
  RULE_NAME as enforceModuleBoundariesRuleName,
} from '../../src/rules/enforce-module-boundaries';
import { TargetProjectLocator } from '@nrwl/workspace/src/core/target-project-locator';
import { mapProjectGraphFiles } from '@nrwl/workspace/src/utils/runtime-lint-utils';
jest.mock('fs', () => require('memfs').fs);
jest.mock('@nrwl/tao/src/utils/app-root', () => ({
  appRootPath: '/root',
}));

const tsconfig = {
  compilerOptions: {
    baseUrl: '.',
    paths: {
      '@mycompany/impl': ['libs/impl/src/index.ts'],
      '@mycompany/untagged': ['libs/untagged/src/index.ts'],
      '@mycompany/api': ['libs/api/src/index.ts'],
      '@mycompany/impl-domain2': ['libs/impl-domain2/src/index.ts'],
      '@mycompany/impl-both-domains': ['libs/impl-both-domains/src/index.ts'],
      '@mycompany/impl2': ['libs/impl2/src/index.ts'],
      '@mycompany/other': ['libs/other/src/index.ts'],
      '@mycompany/other/a/b': ['libs/other/src/a/b.ts'],
      '@mycompany/other/a': ['libs/other/src/a/index.ts'],
      '@mycompany/another/a/b': ['libs/another/a/b.ts'],
      '@mycompany/myapp': ['apps/myapp/src/index.ts'],
      '@mycompany/myapp-e2e': ['apps/myapp-e2e/src/index.ts'],
      '@mycompany/mylib': ['libs/mylib/src/index.ts'],
      '@mycompany/mylibName': ['libs/mylibName/src/index.ts'],
      '@mycompany/anotherlibName': ['libs/anotherlibName/src/index.ts'],
      '@mycompany/badcirclelib': ['libs/badcirclelib/src/index.ts'],
      '@mycompany/domain1': ['libs/domain1/src/index.ts'],
      '@mycompany/domain2': ['libs/domain2/src/index.ts'],
      '@mycompany/buildableLib': ['libs/buildableLib/src/main.ts'],
      '@nonBuildableScope/nonBuildableLib': [
        'libs/nonBuildableLib/src/main.ts',
      ],
    },
    types: ['node'],
  },
  exclude: ['**/*.spec.ts'],
  include: ['**/*.ts'],
};

const fileSys = {
  './libs/impl/src/index.ts': '',
  './libs/untagged/src/index.ts': '',
  './libs/api/src/index.ts': '',
  './libs/impl-domain2/src/index.ts': '',
  './libs/impl-both-domains/src/index.ts': '',
  './libs/impl2/src/index.ts': '',
  './libs/other/src/index.ts': '',
  './libs/other/src/a/b.ts': '',
  './libs/other/src/a/index.ts': '',
  './libs/another/a/b.ts': '',
  './apps/myapp/src/index.ts': '',
  './libs/mylib/src/index.ts': '',
  './libs/mylibName/src/index.ts': '',
  './libs/anotherlibName/src/index.ts': '',
  './libs/badcirclelib/src/index.ts': '',
  './libs/domain1/src/index.ts': '',
  './libs/domain2/src/index.ts': '',
  './libs/buildableLib/src/main.ts': '',
  './libs/nonBuildableLib/src/main.ts': '',
  './tsconfig.base.json': JSON.stringify(tsconfig),
};

describe('Enforce Module Boundaries (eslint)', () => {
  beforeEach(() => {
    vol.fromJSON(fileSys, '/root');
  });

  it('should not error when everything is in order', () => {
    const failures = runRule(
      { allow: ['@mycompany/mylib/deep'] },
      `${process.cwd()}/proj/apps/myapp/src/main.ts`,
      `
        import '@mycompany/mylib';
        import '@mycompany/mylib/deep';
        import '../blah';
        import('@mycompany/mylib');
        import('@mycompany/mylib/deep');
        import('../blah');
      `,
      {
        nodes: {
          myappName: {
            name: 'myappName',
            type: ProjectType.app,
            data: {
              root: 'libs/myapp',
              tags: [],
              implicitDependencies: [],
              architect: {},
              files: [
                createFile(`apps/myapp/src/main.ts`),
                createFile(`apps/myapp/blah.ts`),
              ],
            },
          },
          mylibName: {
            name: 'mylibName',
            type: ProjectType.lib,
            data: {
              root: 'libs/mylib',
              tags: [],
              implicitDependencies: [],
              architect: {},
              files: [
                createFile(`libs/mylib/src/index.ts`),
                createFile(`libs/mylib/src/deep.ts`),
              ],
            },
          },
        },
        dependencies: {},
      }
    );

    expect(failures.length).toEqual(0);
  });

  it('should handle multiple projects starting with the same prefix properly', () => {
    const failures = runRule(
      {},
      `${process.cwd()}/proj/apps/myapp/src/main.ts`,
      `
        import '@mycompany/myapp2/mylib';
        import('@mycompany/myapp2/mylib');
      `,
      {
        nodes: {
          myappName: {
            name: 'myappName',
            type: ProjectType.app,
            data: {
              root: 'libs/myapp',
              tags: [],
              implicitDependencies: [],
              architect: {},
              files: [
                createFile(`apps/myapp/src/main.ts`),
                createFile(`apps/myapp/src/blah.ts`),
              ],
            },
          },
          myapp2Name: {
            name: 'myapp2Name',
            type: ProjectType.app,
            data: {
              root: 'libs/myapp2',
              tags: [],
              implicitDependencies: [],
              architect: {},
              files: [],
            },
          },
          'myapp2-mylib': {
            name: 'myapp2-mylib',
            type: ProjectType.lib,
            data: {
              root: 'libs/myapp2/mylib',
              tags: [],
              implicitDependencies: [],
              architect: {},
              files: [createFile('libs/myapp2/mylib/src/index.ts')],
            },
          },
        },
        dependencies: {},
      }
    );

    expect(failures.length).toEqual(0);
  });

  describe('depConstraints', () => {
    const graph = {
      nodes: {
        apiName: {
          name: 'apiName',
          type: ProjectType.lib,
          data: {
            root: 'libs/api',
            tags: ['api', 'domain1'],
            implicitDependencies: [],
            architect: {},
            files: [createFile(`libs/api/src/index.ts`)],
          },
        },
        'impl-both-domainsName': {
          name: 'impl-both-domainsName',
          type: ProjectType.lib,
          data: {
            root: 'libs/impl-both-domains',
            tags: ['impl', 'domain1', 'domain2'],
            implicitDependencies: [],
            architect: {},
            files: [createFile(`libs/impl-both-domains/src/index.ts`)],
          },
        },
        'impl-domain2Name': {
          name: 'impl-domain2Name',
          type: ProjectType.lib,
          data: {
            root: 'libs/impl-domain2',
            tags: ['impl', 'domain2'],
            implicitDependencies: [],
            architect: {},
            files: [createFile(`libs/impl-domain2/src/index.ts`)],
          },
        },
        impl2Name: {
          name: 'impl2Name',
          type: ProjectType.lib,
          data: {
            root: 'libs/impl2',
            tags: ['impl', 'domain1'],
            implicitDependencies: [],
            architect: {},
            files: [createFile(`libs/impl2/src/index.ts`)],
          },
        },
        implName: {
          name: 'implName',
          type: ProjectType.lib,
          data: {
            root: 'libs/impl',
            tags: ['impl', 'domain1'],
            implicitDependencies: [],
            architect: {},
            files: [createFile(`libs/impl/src/index.ts`)],
          },
        },
        untaggedName: {
          name: 'untaggedName',
          type: ProjectType.lib,
          data: {
            root: 'libs/untagged',
            tags: [],
            implicitDependencies: [],
            architect: {},
            files: [createFile(`libs/untagged/src/index.ts`)],
          },
        },
        npmPackage: {
          name: 'npm:npm-package',
          type: 'npm',
          data: {
            packageName: 'npm-package',
            version: '0.0.0',
            files: [],
          },
        },
      },
      dependencies: {},
    };

    const depConstraints = {
      depConstraints: [
        { sourceTag: 'api', onlyDependOnLibsWithTags: ['api'] },
        { sourceTag: 'impl', onlyDependOnLibsWithTags: ['api', 'impl'] },
        { sourceTag: 'domain1', onlyDependOnLibsWithTags: ['domain1'] },
        { sourceTag: 'domain2', onlyDependOnLibsWithTags: ['domain2'] },
      ],
    };

    beforeEach(() => {
      vol.fromJSON(fileSys, '/root');
    });

    it('should error when the target library does not have the right tag', () => {
      const failures = runRule(
        depConstraints,
        `${process.cwd()}/proj/libs/api/src/index.ts`,
        `
          import '@mycompany/impl';
          import('@mycompany/impl');
        `,
        graph
      );

      const message =
        'A project tagged with "api" can only depend on libs tagged with "api"';
      expect(failures.length).toEqual(2);
      expect(failures[0].message).toEqual(message);
      expect(failures[1].message).toEqual(message);
    });

    it('should allow imports to npm packages', () => {
      const failures = runRule(
        depConstraints,
        `${process.cwd()}/proj/libs/api/src/index.ts`,
        `
          import 'npm-package';
          import('npm-package');
        `,
        graph
      );

      expect(failures.length).toEqual(0);
    });

    it('should error when the target library is untagged', () => {
      const failures = runRule(
        depConstraints,
        `${process.cwd()}/proj/libs/api/src/index.ts`,
        `
          import '@mycompany/untagged';
          import('@mycompany/untagged');
        `,
        graph
      );

      const message =
        'A project tagged with "api" can only depend on libs tagged with "api"';
      expect(failures.length).toEqual(2);
      expect(failures[0].message).toEqual(message);
      expect(failures[1].message).toEqual(message);
    });

    it('should error when the source library is untagged', () => {
      const failures = runRule(
        depConstraints,
        `${process.cwd()}/proj/libs/untagged/src/index.ts`,
        `
          import '@mycompany/api';
          import('@mycompany/api');
        `,
        graph
      );

      const message = 'A project without tags cannot depend on any libraries';
      expect(failures.length).toEqual(2);
      expect(failures[0].message).toEqual(message);
      expect(failures[1].message).toEqual(message);
    });

    it('should check all tags', () => {
      const failures = runRule(
        depConstraints,
        `${process.cwd()}/proj/libs/impl/src/index.ts`,
        `
          import '@mycompany/impl-domain2';
          import('@mycompany/impl-domain2');
        `,
        graph
      );

      const message =
        'A project tagged with "domain1" can only depend on libs tagged with "domain1"';
      expect(failures.length).toEqual(2);
      expect(failures[0].message).toEqual(message);
      expect(failures[1].message).toEqual(message);
    });

    it('should allow a domain1 project to depend on a project that is tagged with domain1 and domain2', () => {
      const failures = runRule(
        depConstraints,
        `${process.cwd()}/proj/libs/impl/src/index.ts`,
        `
          import '@mycompany/impl-both-domains';
          import('@mycompany/impl-both-domains');
        `,
        graph
      );

      expect(failures.length).toEqual(0);
    });

    it('should allow a domain1/domain2 project depend on domain1', () => {
      const failures = runRule(
        depConstraints,
        `${process.cwd()}/proj/libs/impl-both-domain/src/index.ts`,
        `
          import '@mycompany/impl';
          import('@mycompany/impl');
        `,
        graph
      );

      expect(failures.length).toEqual(0);
    });

    it('should not error when the constraints are satisfied', () => {
      const failures = runRule(
        depConstraints,
        `${process.cwd()}/proj/libs/impl/src/index.ts`,
        `
          import '@mycompany/impl2';
          import('@mycompany/impl2');
        `,
        graph
      );

      expect(failures.length).toEqual(0);
    });

    it('should support wild cards', () => {
      const failures = runRule(
        {
          depConstraints: [{ sourceTag: '*', onlyDependOnLibsWithTags: ['*'] }],
        },
        `${process.cwd()}/proj/libs/api/src/index.ts`,
        `
          import '@mycompany/impl';
          import('@mycompany/impl');
        `,
        graph
      );

      expect(failures.length).toEqual(0);
    });
  });

  describe('relative imports', () => {
    it('should not error when relatively importing the same library', () => {
      const failures = runRule(
        {},
        `${process.cwd()}/proj/libs/mylib/src/main.ts`,
        `
          import '../other';
          import('../other');
        `,
        {
          nodes: {
            mylibName: {
              name: 'mylibName',
              type: ProjectType.lib,
              data: {
                root: 'libs/mylib',
                tags: [],
                implicitDependencies: [],
                architect: {},
                files: [
                  createFile(`libs/mylib/src/main.ts`),
                  createFile(`libs/mylib/other.ts`),
                ],
              },
            },
          },
          dependencies: {},
        }
      );
      expect(failures.length).toEqual(0);
    });

    it('should not error when relatively importing the same library (index file)', () => {
      const failures = runRule(
        {},
        `${process.cwd()}/proj/libs/mylib/src/main.ts`,
        `
          import '../other';
          import('../other');
        `,
        {
          nodes: {
            mylibName: {
              name: 'mylibName',
              type: ProjectType.lib,
              data: {
                root: 'libs/mylib',
                tags: [],
                implicitDependencies: [],
                architect: {},
                files: [
                  createFile(`libs/mylib/src/main.ts`),
                  createFile(`libs/mylib/other/index.ts`),
                ],
              },
            },
          },
          dependencies: {},
        }
      );
      expect(failures.length).toEqual(0);
    });

    it('should error when relatively importing another library', () => {
      const failures = runRule(
        {},
        `${process.cwd()}/proj/libs/mylib/src/main.ts`,
        `
          import '../../other';
          import('../../other');
        `,
        {
          nodes: {
            mylibName: {
              name: 'mylibName',
              type: ProjectType.lib,
              data: {
                root: 'libs/mylib',
                tags: [],
                implicitDependencies: [],
                architect: {},
                files: [createFile(`libs/mylib/src/main.ts`)],
              },
            },
            otherName: {
              name: 'otherName',
              type: ProjectType.lib,
              data: {
                root: 'libs/other',
                tags: [],
                implicitDependencies: [],
                architect: {},
                files: [createFile('libs/other/src/index.ts')],
              },
            },
          },
          dependencies: {},
        }
      );

      const message =
        'Libraries cannot be imported by a relative or absolute path, and must begin with a npm scope';
      expect(failures.length).toEqual(2);
      expect(failures[0].message).toEqual(message);
      expect(failures[1].message).toEqual(message);
    });

    it('should error when relatively importing the src directory of another library', () => {
      const failures = runRule(
        {},
        `${process.cwd()}/proj/libs/mylib/src/main.ts`,
        `
          import '../../other/src';
          import('../../other/src');
        `,
        {
          nodes: {
            mylibName: {
              name: 'mylibName',
              type: ProjectType.lib,
              data: {
                root: 'libs/mylib',
                tags: [],
                implicitDependencies: [],
                architect: {},
                files: [createFile(`libs/mylib/src/main.ts`)],
              },
            },
            otherName: {
              name: 'otherName',
              type: ProjectType.lib,
              data: {
                root: 'libs/other',
                tags: [],
                implicitDependencies: [],
                architect: {},
                files: [createFile('libs/other/src/index.ts')],
              },
            },
          },
          dependencies: {},
        }
      );

      const message =
        'Libraries cannot be imported by a relative or absolute path, and must begin with a npm scope';
      expect(failures.length).toEqual(2);
      expect(failures[0].message).toEqual(message);
      expect(failures[1].message).toEqual(message);
    });
  });

  it('should error on absolute imports into libraries without using the npm scope', () => {
    const failures = runRule(
      {},
      `${process.cwd()}/proj/libs/mylib/src/main.ts`,
      `
        import 'libs/src/other';
        import('libs/src/other');
      `,
      {
        nodes: {
          mylibName: {
            name: 'mylibName',
            type: ProjectType.lib,
            data: {
              root: 'libs/mylib',
              tags: [],
              implicitDependencies: [],
              architect: {},
              files: [
                createFile(`libs/mylib/src/main.ts`),
                createFile(`libs/mylib/src/other.ts`),
              ],
            },
          },
        },
        dependencies: {},
      }
    );

    const message =
      'Libraries cannot be imported by a relative or absolute path, and must begin with a npm scope';
    expect(failures.length).toEqual(2);
    expect(failures[0].message).toEqual(message);
    expect(failures[1].message).toEqual(message);
  });

  it('should respect regexp in allow option', () => {
    const failures = runRule(
      { allow: ['^.*/utils/.*$'] },
      `${process.cwd()}/proj/libs/mylib/src/main.ts`,
      `
        import '../../utils/a';
        import('../../utils/a');
      `,
      {
        nodes: {
          mylibName: {
            name: 'mylibName',
            type: ProjectType.lib,
            data: {
              root: 'libs/mylib',
              tags: [],
              implicitDependencies: [],
              architect: {},
              files: [createFile(`libs/mylib/src/main.ts`)],
            },
          },
          utils: {
            name: 'utils',
            type: ProjectType.lib,
            data: {
              root: 'libs/utils',
              tags: [],
              implicitDependencies: [],
              architect: {},
              files: [createFile(`libs/utils/a.ts`)],
            },
          },
        },
        dependencies: {},
      }
    );

    expect(failures.length).toEqual(0);
  });

  it.each`
    importKind | shouldError | importStatement
    ${'value'} | ${true}     | ${'import { someValue } from "@mycompany/other";'}
    ${'type'}  | ${false}    | ${'import type { someType } from "@mycompany/other";'}
  `(
    `when importing a lazy-loaded library:
    \t importKind: $importKind
    \t shouldError: $shouldError`,
    ({ importKind, importStatement }) => {
      const failures = runRule(
        {},
        `${process.cwd()}/proj/libs/mylib/src/main.ts`,
        importStatement,
        {
          nodes: {
            mylibName: {
              name: 'mylibName',
              type: ProjectType.lib,
              data: {
                root: 'libs/mylib',
                tags: [],
                implicitDependencies: [],
                architect: {},
                files: [createFile(`libs/mylib/src/main.ts`)],
              },
            },
            otherName: {
              name: 'otherName',
              type: ProjectType.lib,
              data: {
                root: 'libs/other',
                tags: [],
                implicitDependencies: [],
                architect: {},
                files: [createFile(`libs/other/index.ts`)],
              },
            },
          },
          dependencies: {
            mylibName: [
              {
                source: 'mylibName',
                target: 'otherName',
                type: DependencyType.dynamic,
              },
            ],
          },
        }
      );
      if (importKind === 'type') {
        expect(failures.length).toEqual(0);
      } else {
        expect(failures[0].message).toEqual(
          'Imports of lazy-loaded libraries are forbidden'
        );
      }
    }
  );

  it('should error on importing an app', () => {
    const failures = runRule(
      {},
      `${process.cwd()}/proj/libs/mylib/src/main.ts`,
      `
        import '@mycompany/myapp';
        import('@mycompany/myapp');
      `,
      {
        nodes: {
          mylibName: {
            name: 'mylibName',
            type: ProjectType.lib,
            data: {
              root: 'libs/mylib',
              tags: [],
              implicitDependencies: [],
              architect: {},
              files: [createFile(`libs/mylib/src/main.ts`)],
            },
          },
          myappName: {
            name: 'myappName',
            type: ProjectType.app,
            data: {
              root: 'apps/myapp',
              tags: [],
              implicitDependencies: [],
              architect: {},
              files: [createFile(`apps/myapp/src/index.ts`)],
            },
          },
        },
        dependencies: {},
      }
    );

    const message = 'Imports of apps are forbidden';
    expect(failures.length).toEqual(2);
    expect(failures[0].message).toEqual(message);
    expect(failures[1].message).toEqual(message);
  });

  it('should error on importing an e2e project', () => {
    const failures = runRule(
      {},
      `${process.cwd()}/proj/libs/mylib/src/main.ts`,
      `
        import '@mycompany/myapp-e2e';
        import('@mycompany/myapp-e2e');
      `,
      {
        nodes: {
          mylibName: {
            name: 'mylibName',
            type: ProjectType.lib,
            data: {
              root: 'libs/mylib',
              tags: [],
              implicitDependencies: [],
              architect: {},
              files: [createFile(`libs/mylib/src/main.ts`)],
            },
          },
          myappE2eName: {
            name: 'myappE2eName',
            type: ProjectType.e2e,
            data: {
              root: 'apps/myapp-e2e',
              tags: [],
              implicitDependencies: [],
              architect: {},
              files: [createFile(`apps/myapp-e2e/src/index.ts`)],
            },
          },
        },
        dependencies: {},
      }
    );

    const message = 'Imports of e2e projects are forbidden';
    expect(failures.length).toEqual(2);
    expect(failures[0].message).toEqual(message);
    expect(failures[1].message).toEqual(message);
  });

  it('should error when absolute path within project detected', () => {
    const failures = runRule(
      {},
      `${process.cwd()}/proj/libs/mylib/src/main.ts`,
      `
        import '@mycompany/mylib';
        import('@mycompany/mylib');
      `,
      {
        nodes: {
          mylibName: {
            name: 'mylibName',
            type: ProjectType.lib,
            data: {
              root: 'libs/mylib',
              tags: [],
              implicitDependencies: [],
              architect: {},
              files: [createFile(`libs/mylib/src/main.ts`)],
            },
          },
          anotherlibName: {
            name: 'anotherlibName',
            type: ProjectType.lib,
            data: {
              root: 'libs/anotherlib',
              tags: [],
              implicitDependencies: [],
              architect: {},
              files: [createFile(`libs/anotherlib/src/main.ts`)],
            },
          },
          myappName: {
            name: 'myappName',
            type: ProjectType.app,
            data: {
              root: 'apps/myapp',
              tags: [],
              implicitDependencies: [],
              architect: {},
              files: [createFile(`apps/myapp/src/index.ts`)],
            },
          },
        },
        dependencies: {
          mylibName: [
            {
              source: 'mylibName',
              target: 'anotherlibName',
              type: DependencyType.static,
            },
          ],
        },
      }
    );

    const message =
      'Projects should use relative imports to import from other files within the same project. Use "./path/to/file" instead of import from "@mycompany/mylib"';
    expect(failures.length).toEqual(2);
    expect(failures[0].message).toEqual(message);
    expect(failures[1].message).toEqual(message);
  });

  it('should ignore detected absolute path within project if allowCircularSelfDependency flag is set', () => {
    const failures = runRule(
      {
        allowCircularSelfDependency: true,
      },
      `${process.cwd()}/proj/libs/mylib/src/main.ts`,
      `
        import '@mycompany/mylib';
        import('@mycompany/mylib');
      `,
      {
        nodes: {
          mylibName: {
            name: 'mylibName',
            type: ProjectType.lib,
            data: {
              root: 'libs/mylib',
              tags: [],
              implicitDependencies: [],
              architect: {},
              files: [createFile(`libs/mylib/src/main.ts`)],
            },
          },
          anotherlibName: {
            name: 'anotherlibName',
            type: ProjectType.lib,
            data: {
              root: 'libs/anotherlib',
              tags: [],
              implicitDependencies: [],
              architect: {},
              files: [createFile(`libs/anotherlib/src/main.ts`)],
            },
          },
          myappName: {
            name: 'myappName',
            type: ProjectType.app,
            data: {
              root: 'apps/myapp',
              tags: [],
              implicitDependencies: [],
              architect: {},
              files: [createFile(`apps/myapp/src/index.ts`)],
            },
          },
        },
        dependencies: {
          mylibName: [
            {
              source: 'mylibName',
              target: 'anotherlibName',
              type: DependencyType.static,
            },
          ],
        },
      }
    );

    expect(failures.length).toBe(0);
  });

  it('should error when circular dependency detected', () => {
    const failures = runRule(
      {},
      `${process.cwd()}/proj/libs/anotherlib/src/main.ts`,
      `
        import '@mycompany/mylib';
        import('@mycompany/mylib');
      `,
      {
        nodes: {
          mylibName: {
            name: 'mylibName',
            type: ProjectType.lib,
            data: {
              root: 'libs/mylib',
              tags: [],
              implicitDependencies: [],
              architect: {},
              files: [createFile(`libs/mylib/src/main.ts`)],
            },
          },
          anotherlibName: {
            name: 'anotherlibName',
            type: ProjectType.lib,
            data: {
              root: 'libs/anotherlib',
              tags: [],
              implicitDependencies: [],
              architect: {},
              files: [createFile(`libs/anotherlib/src/main.ts`)],
            },
          },
          myappName: {
            name: 'myappName',
            type: ProjectType.app,
            data: {
              root: 'apps/myapp',
              tags: [],
              implicitDependencies: [],
              architect: {},
              files: [createFile(`apps/myapp/src/index.ts`)],
            },
          },
        },
        dependencies: {
          mylibName: [
            {
              source: 'mylibName',
              target: 'anotherlibName',
              type: DependencyType.static,
            },
          ],
        },
      }
    );

    const message =
      'Circular dependency between "anotherlibName" and "mylibName" detected: anotherlibName -> mylibName -> anotherlibName';
    expect(failures.length).toEqual(2);
    expect(failures[0].message).toEqual(message);
    expect(failures[1].message).toEqual(message);
  });

  it('should error when circular dependency detected (indirect)', () => {
    const failures = runRule(
      {},
      `${process.cwd()}/proj/libs/mylib/src/main.ts`,
      `
        import '@mycompany/badcirclelib';
        import('@mycompany/badcirclelib');
      `,
      {
        nodes: {
          mylibName: {
            name: 'mylibName',
            type: ProjectType.lib,
            data: {
              root: 'libs/mylib',
              tags: [],
              implicitDependencies: [],
              architect: {},
              files: [createFile(`libs/mylib/src/main.ts`)],
            },
          },
          anotherlibName: {
            name: 'anotherlibName',
            type: ProjectType.lib,
            data: {
              root: 'libs/anotherlib',
              tags: [],
              implicitDependencies: [],
              architect: {},
              files: [createFile(`libs/anotherlib/src/main.ts`)],
            },
          },
          badcirclelibName: {
            name: 'badcirclelibName',
            type: ProjectType.lib,
            data: {
              root: 'libs/badcirclelib',
              tags: [],
              implicitDependencies: [],
              architect: {},
              files: [createFile(`libs/badcirclelib/src/main.ts`)],
            },
          },
          myappName: {
            name: 'myappName',
            type: ProjectType.app,
            data: {
              root: 'apps/myapp',
              tags: [],
              implicitDependencies: [],
              architect: {},
              files: [createFile(`apps/myapp/index.ts`)],
            },
          },
        },
        dependencies: {
          mylibName: [
            {
              source: 'mylibName',
              target: 'badcirclelibName',
              type: DependencyType.static,
            },
          ],
          badcirclelibName: [
            {
              source: 'badcirclelibName',
              target: 'anotherlibName',
              type: DependencyType.static,
            },
          ],
          anotherlibName: [
            {
              source: 'anotherlibName',
              target: 'mylibName',
              type: DependencyType.static,
            },
          ],
        },
      }
    );

    const message =
      'Circular dependency between "mylibName" and "badcirclelibName" detected: mylibName -> badcirclelibName -> anotherlibName -> mylibName';
    expect(failures.length).toEqual(2);
    expect(failures[0].message).toEqual(message);
    expect(failures[1].message).toEqual(message);
  });

  describe('buildable library imports', () => {
    it('should ignore the buildable library verification if the enforceBuildableLibDependency is set to false', () => {
      const failures = runRule(
        {
          enforceBuildableLibDependency: false,
        },
        `${process.cwd()}/proj/libs/buildableLib/src/main.ts`,
        `
          import '@mycompany/nonBuildableLib';
          import('@mycompany/nonBuildableLib');
        `,
        {
          nodes: {
            buildableLib: {
              name: 'buildableLib',
              type: ProjectType.lib,
              data: {
                root: 'libs/buildableLib',
                tags: [],
                implicitDependencies: [],
                architect: {
                  build: {
                    // defines a buildable lib
                    builder: '@angular-devkit/build-ng-packagr:build',
                  },
                },
                files: [createFile(`libs/buildableLib/src/main.ts`)],
              },
            },
            nonBuildableLib: {
              name: 'nonBuildableLib',
              type: ProjectType.lib,
              data: {
                root: 'libs/nonBuildableLib',
                tags: [],
                implicitDependencies: [],
                architect: {},
                files: [createFile(`libs/nonBuildableLib/src/main.ts`)],
              },
            },
          },
          dependencies: {},
        }
      );

      expect(failures.length).toBe(0);
    });

    it('should error when buildable libraries import non-buildable libraries', () => {
      const failures = runRule(
        {
          enforceBuildableLibDependency: true,
        },
        `${process.cwd()}/proj/libs/buildableLib/src/main.ts`,
        `
          import '@nonBuildableScope/nonBuildableLib';
          import('@nonBuildableScope/nonBuildableLib');
        `,
        {
          nodes: {
            buildableLib: {
              name: 'buildableLib',
              type: ProjectType.lib,
              data: {
                root: 'libs/buildableLib',
                tags: [],
                implicitDependencies: [],
                targets: {
                  build: {
                    // defines a buildable lib
                    executor: '@angular-devkit/build-ng-packagr:build',
                  },
                },
                files: [createFile(`libs/buildableLib/src/main.ts`)],
              },
            },
            nonBuildableLib: {
              name: 'nonBuildableLib',
              type: ProjectType.lib,
              data: {
                root: 'libs/nonBuildableLib',
                tags: [],
                implicitDependencies: [],
                targets: {},
                files: [createFile(`libs/nonBuildableLib/src/main.ts`)],
              },
            },
          },
          dependencies: {},
        }
      );

      const message =
        'Buildable libraries cannot import or export from non-buildable libraries';
      expect(failures.length).toEqual(2);
      expect(failures[0].message).toEqual(message);
      expect(failures[1].message).toEqual(message);
    });

    it('should not error when buildable libraries import another buildable libraries', () => {
      const failures = runRule(
        {
          enforceBuildableLibDependency: true,
        },
        `${process.cwd()}/proj/libs/buildableLib/src/main.ts`,
        `
          import '@mycompany/anotherBuildableLib';
          import('@mycompany/anotherBuildableLib');
        `,
        {
          nodes: {
            buildableLib: {
              name: 'buildableLib',
              type: ProjectType.lib,
              data: {
                root: 'libs/buildableLib',
                tags: [],
                implicitDependencies: [],
                architect: {
                  build: {
                    // defines a buildable lib
                    builder: '@angular-devkit/build-ng-packagr:build',
                  },
                },
                files: [createFile(`libs/buildableLib/src/main.ts`)],
              },
            },
            anotherBuildableLib: {
              name: 'anotherBuildableLib',
              type: ProjectType.lib,
              data: {
                root: 'libs/anotherBuildableLib',
                tags: [],
                implicitDependencies: [],
                architect: {
                  build: {
                    // defines a buildable lib
                    builder: '@angular-devkit/build-ng-packagr:build',
                  },
                },
                files: [createFile(`libs/anotherBuildableLib/src/main.ts`)],
              },
            },
          },
          dependencies: {},
        }
      );

      expect(failures.length).toBe(0);
    });

    it('should ignore the buildable library verification if no architect is specified', () => {
      const failures = runRule(
        {
          enforceBuildableLibDependency: true,
        },
        `${process.cwd()}/proj/libs/buildableLib/src/main.ts`,
        `
          import '@mycompany/nonBuildableLib';
          import('@mycompany/nonBuildableLib');
        `,
        {
          nodes: {
            buildableLib: {
              name: 'buildableLib',
              type: ProjectType.lib,
              data: {
                root: 'libs/buildableLib',
                tags: [],
                implicitDependencies: [],
                files: [createFile(`libs/buildableLib/src/main.ts`)],
              },
            },
            nonBuildableLib: {
              name: 'nonBuildableLib',
              type: ProjectType.lib,
              data: {
                root: 'libs/nonBuildableLib',
                tags: [],
                implicitDependencies: [],
                files: [createFile(`libs/nonBuildableLib/src/main.ts`)],
              },
            },
          },
          dependencies: {},
        }
      );

      expect(failures.length).toBe(0);
    });

    it('should error when exporting all from a non-buildable library', () => {
      const failures = runRule(
        {
          enforceBuildableLibDependency: true,
        },
        `${process.cwd()}/proj/libs/buildableLib/src/main.ts`,
        `
          export * from '@nonBuildableScope/nonBuildableLib';
        `,
        {
          nodes: {
            buildableLib: {
              name: 'buildableLib',
              type: ProjectType.lib,
              data: {
                root: 'libs/buildableLib',
                tags: [],
                implicitDependencies: [],
                targets: {
                  build: {
                    // defines a buildable lib
                    executor: '@angular-devkit/build-ng-packagr:build',
                  },
                },
                files: [createFile(`libs/buildableLib/src/main.ts`)],
              },
            },
            nonBuildableLib: {
              name: 'nonBuildableLib',
              type: ProjectType.lib,
              data: {
                root: 'libs/nonBuildableLib',
                tags: [],
                implicitDependencies: [],
                targets: {},
                files: [createFile(`libs/nonBuildableLib/src/main.ts`)],
              },
            },
          },
          dependencies: {},
        }
      );

      const message =
        'Buildable libraries cannot import or export from non-buildable libraries';
      expect(failures[0].message).toEqual(message);
    });

    it('should not error when exporting all from a buildable library', () => {
      const failures = runRule(
        {
          enforceBuildableLibDependency: true,
        },
        `${process.cwd()}/proj/libs/buildableLib/src/main.ts`,
        `
          export * from '@mycompany/anotherBuildableLib';
        `,
        {
          nodes: {
            buildableLib: {
              name: 'buildableLib',
              type: ProjectType.lib,
              data: {
                root: 'libs/buildableLib',
                tags: [],
                implicitDependencies: [],
                architect: {
                  build: {
                    // defines a buildable lib
                    builder: '@angular-devkit/build-ng-packagr:build',
                  },
                },
                files: [createFile(`libs/buildableLib/src/main.ts`)],
              },
            },
            anotherBuildableLib: {
              name: 'anotherBuildableLib',
              type: ProjectType.lib,
              data: {
                root: 'libs/anotherBuildableLib',
                tags: [],
                implicitDependencies: [],
                architect: {
                  build: {
                    // defines a buildable lib
                    builder: '@angular-devkit/build-ng-packagr:build',
                  },
                },
                files: [createFile(`libs/anotherBuildableLib/src/main.ts`)],
              },
            },
          },
          dependencies: {},
        }
      );

      expect(failures.length).toBe(0);
    });

    it('should error when exporting a named resource from a non-buildable library', () => {
      const failures = runRule(
        {
          enforceBuildableLibDependency: true,
        },
        `${process.cwd()}/proj/libs/buildableLib/src/main.ts`,
        `
          export { foo } from '@nonBuildableScope/nonBuildableLib';
        `,
        {
          nodes: {
            buildableLib: {
              name: 'buildableLib',
              type: ProjectType.lib,
              data: {
                root: 'libs/buildableLib',
                tags: [],
                implicitDependencies: [],
                targets: {
                  build: {
                    // defines a buildable lib
                    executor: '@angular-devkit/build-ng-packagr:build',
                  },
                },
                files: [createFile(`libs/buildableLib/src/main.ts`)],
              },
            },
            nonBuildableLib: {
              name: 'nonBuildableLib',
              type: ProjectType.lib,
              data: {
                root: 'libs/nonBuildableLib',
                tags: [],
                implicitDependencies: [],
                targets: {},
                files: [createFile(`libs/nonBuildableLib/src/main.ts`)],
              },
            },
          },
          dependencies: {},
        }
      );

      const message =
        'Buildable libraries cannot import or export from non-buildable libraries';
      expect(failures[0].message).toEqual(message);
    });

    it('should not error when exporting a named resource from a buildable library', () => {
      const failures = runRule(
        {
          enforceBuildableLibDependency: true,
        },
        `${process.cwd()}/proj/libs/buildableLib/src/main.ts`,
        `
          export { foo } from '@mycompany/anotherBuildableLib';
        `,
        {
          nodes: {
            buildableLib: {
              name: 'buildableLib',
              type: ProjectType.lib,
              data: {
                root: 'libs/buildableLib',
                tags: [],
                implicitDependencies: [],
                architect: {
                  build: {
                    // defines a buildable lib
                    builder: '@angular-devkit/build-ng-packagr:build',
                  },
                },
                files: [createFile(`libs/buildableLib/src/main.ts`)],
              },
            },
            anotherBuildableLib: {
              name: 'anotherBuildableLib',
              type: ProjectType.lib,
              data: {
                root: 'libs/anotherBuildableLib',
                tags: [],
                implicitDependencies: [],
                architect: {
                  build: {
                    // defines a buildable lib
                    builder: '@angular-devkit/build-ng-packagr:build',
                  },
                },
                files: [createFile(`libs/anotherBuildableLib/src/main.ts`)],
              },
            },
          },
          dependencies: {},
        }
      );

      expect(failures.length).toBe(0);
    });

    it('should not error when in-line exporting a named resource', () => {
      const failures = runRule(
        {
          enforceBuildableLibDependency: true,
        },
        `${process.cwd()}/proj/libs/buildableLib/src/main.ts`,
        `
          export class Foo {};
        `,
        {
          nodes: {
            buildableLib: {
              name: 'buildableLib',
              type: ProjectType.lib,
              data: {
                root: 'libs/buildableLib',
                tags: [],
                implicitDependencies: [],
                architect: {
                  build: {
                    // defines a buildable lib
                    builder: '@angular-devkit/build-ng-packagr:build',
                  },
                },
                files: [createFile(`libs/buildableLib/src/main.ts`)],
              },
            },
            anotherBuildableLib: {
              name: 'anotherBuildableLib',
              type: ProjectType.lib,
              data: {
                root: 'libs/anotherBuildableLib',
                tags: [],
                implicitDependencies: [],
                architect: {
                  build: {
                    // defines a buildable lib
                    builder: '@angular-devkit/build-ng-packagr:build',
                  },
                },
                files: [createFile(`libs/anotherBuildableLib/src/main.ts`)],
              },
            },
          },
          dependencies: {},
        }
      );

      expect(failures.length).toBe(0);
    });
  });
});

const linter = new TSESLint.Linter();
const baseConfig = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2018 as const,
    sourceType: 'module' as const,
  },
  rules: {
    [enforceModuleBoundariesRuleName]: 'error',
  },
};
linter.defineParser('@typescript-eslint/parser', parser);
linter.defineRule(enforceModuleBoundariesRuleName, enforceModuleBoundaries);

function createFile(f) {
  return { file: f, hash: '' };
}

function runRule(
  ruleArguments: any,
  contentPath: string,
  content: string,
  projectGraph: ProjectGraph
): TSESLint.Linter.LintMessage[] {
  (global as any).projectPath = `${process.cwd()}/proj`;
  (global as any).npmScope = 'mycompany';
  (global as any).projectGraph = mapProjectGraphFiles(projectGraph);
  (global as any).targetProjectLocator = new TargetProjectLocator(
    projectGraph.nodes
  );

  const config = {
    ...baseConfig,
    rules: {
      [enforceModuleBoundariesRuleName]: ['error', ruleArguments],
    },
  };

  return linter.verify(content, config as any, contentPath);
}
