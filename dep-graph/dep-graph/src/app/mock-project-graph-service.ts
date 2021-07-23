import { ProjectGraphDependency, ProjectGraphNode } from '@nrwl/devkit';
// nx-ignore-next-line
import { DepGraphClientResponse } from '@nrwl/workspace/src/command-line/dep-graph';
import { ProjectGraphService } from '../app/models';

export class MockProjectGraphService implements ProjectGraphService {
  private response: DepGraphClientResponse = {
    hash: '79054025255fb1a26e4bc422aef54eb4',
    layout: {
      appsDir: 'apps',
      libsDir: 'libs',
    },
    projects: [
      {
        name: 'existing-app-1',
        type: 'app',
        data: {
          root: 'apps/app1',
          tags: [],
        },
      },
      {
        name: 'existing-lib-1',
        type: 'lib',
        data: {
          root: 'libs/lib1',
          tags: [],
        },
      },
    ],
    dependencies: {
      'existing-app-1': [
        {
          source: 'existing-app-1',
          target: 'existing-lib-1',
          type: 'statis',
        },
      ],
      'existing-lib-1': [],
    },
    changes: {
      added: [],
    },
    affected: [],
    focus: null,
    exclude: [],
    groupByFolder: false,
  };

  constructor(updateFrequency: number = 7500) {
    setInterval(() => this.updateResponse(), updateFrequency);
  }

  async getHash(): Promise<string> {
    return new Promise((resolve) => resolve(this.response.hash));
  }

  getProjectGraph(url: string): Promise<DepGraphClientResponse> {
    return new Promise((resolve) => resolve(this.response));
  }

  private createNewProject(): ProjectGraphNode {
    const type = Math.random() > 0.25 ? 'lib' : 'app';
    const name = `${type}-${this.response.projects.length + 1}`;

    return {
      name,
      type,
      data: {
        root: type === 'app' ? `apps/${name}` : `libs/${name}`,
        tags: [],
      },
    };
  }

  private updateResponse() {
    const newProject = this.createNewProject();
    const libProjects = this.response.projects.filter(
      (project) => project.type === 'lib'
    );

    const targetDependency =
      libProjects[Math.floor(Math.random() * libProjects.length)];
    const newDependency: ProjectGraphDependency[] = [
      {
        source: newProject.name,
        target: targetDependency.name,
        type: 'static',
      },
    ];
    this.response.projects.push(newProject);
    this.response.dependencies[newProject.name] = newDependency;
    this.response.changes.added.push(newProject.name);
  }
}
