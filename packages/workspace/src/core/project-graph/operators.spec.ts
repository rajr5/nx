import { DependencyType, ProjectGraph } from './project-graph-models';
import { reverse, withDeps } from './operators';

const graph: ProjectGraph = {
  nodes: {
    'app1-e2e': { name: 'app1-e2e', type: 'app', data: null },
    app1: { name: 'app1', type: 'app', data: null },
    lib1: { name: 'lib1', type: 'lib', data: null },
    lib2: { name: 'lib2', type: 'lib', data: null },
    lib3: { name: 'lib3', type: 'lib', data: null }
  },
  dependencies: {
    'app1-e2e': [
      {
        type: DependencyType.implicit,
        source: 'app1-e2e',
        target: 'app1'
      }
    ],
    app1: [
      {
        type: DependencyType.static,
        source: 'app1',
        target: 'lib1'
      }
    ],
    lib1: [
      {
        type: DependencyType.static,
        source: 'lib1',
        target: 'lib2'
      },
      {
        type: DependencyType.static,
        source: 'lib1',
        target: 'lib3'
      }
    ],
    lib2: [
      {
        type: DependencyType.static,
        source: 'lib2',
        target: 'lib3'
      }
    ]
  }
};

describe('reverse', () => {
  it('should reverse dependency direction', () => {
    const result = reverse(graph);
    expect(result).toEqual({
      nodes: {
        'app1-e2e': { name: 'app1-e2e', type: 'app', data: null },
        app1: { name: 'app1', type: 'app', data: null },
        lib1: { name: 'lib1', type: 'lib', data: null },
        lib2: { name: 'lib2', type: 'lib', data: null },
        lib3: { name: 'lib3', type: 'lib', data: null }
      },
      dependencies: {
        app1: [
          {
            type: DependencyType.implicit,
            source: 'app1',
            target: 'app1-e2e'
          }
        ],
        lib1: [
          {
            type: DependencyType.static,
            source: 'lib1',
            target: 'app1'
          }
        ],
        lib2: [
          {
            type: DependencyType.static,
            source: 'lib2',
            target: 'lib1'
          }
        ],
        lib3: [
          {
            type: DependencyType.static,
            source: 'lib3',
            target: 'lib1'
          },
          {
            type: DependencyType.static,
            source: 'lib3',
            target: 'lib2'
          }
        ]
      }
    });
  });
});

describe('withDeps', () => {
  it('should return a new graph with all dependencies included from original', () => {
    const affectedNodes = [
      { name: 'app1-e2e', type: 'app', data: null },
      { name: 'app1', type: 'app', data: null },
      { name: 'lib1', type: 'lib', data: null }
    ];

    const result = withDeps(graph, affectedNodes);
    expect(result).toEqual({
      nodes: {
        lib3: {
          name: 'lib3',
          type: 'lib',
          data: null
        },
        lib2: {
          name: 'lib2',
          type: 'lib',
          data: null
        },
        lib1: {
          name: 'lib1',
          type: 'lib',
          data: null
        },
        app1: {
          name: 'app1',
          type: 'app',
          data: null
        },
        'app1-e2e': {
          name: 'app1-e2e',
          type: 'app',
          data: null
        }
      },
      dependencies: {
        lib2: [
          {
            type: 'static',
            source: 'lib2',
            target: 'lib3'
          }
        ],
        lib1: [
          {
            type: 'static',
            source: 'lib1',
            target: 'lib2'
          },
          {
            type: 'static',
            source: 'lib1',
            target: 'lib3'
          }
        ],
        app1: [
          {
            type: 'static',
            source: 'app1',
            target: 'lib1'
          }
        ],
        'app1-e2e': [
          {
            type: 'implicit',
            source: 'app1-e2e',
            target: 'app1'
          }
        ]
      }
    });
  });
});
