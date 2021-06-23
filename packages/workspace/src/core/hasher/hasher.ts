import { Task } from '../../tasks-runner/tasks-runner';
import { workspaceFileName } from '../file-utils';
import { exec } from 'child_process';
import { defaultFileHasher, FileHasher } from './file-hasher';
import { defaultHashing, HashingImpl } from './hashing-impl';
import * as minimatch from 'minimatch';
import { performance } from 'perf_hooks';
import { parseJson, readJsonFile } from '@nrwl/devkit';
import {
  NxJsonConfiguration,
  ProjectGraph,
  WorkspaceJsonConfiguration,
} from '@nrwl/devkit';
import { resolveNewFormatWithInlineProjects } from '@nrwl/tao/src/shared/workspace';

export interface Hash {
  value: string;
  details: {
    command: string;
    nodes: { [name: string]: string };
    implicitDeps: { [fileName: string]: string };
    runtime: { [input: string]: string };
  };
}

interface ProjectHashResult {
  value: string;
  nodes: { [name: string]: string };
}

interface ImplicitHashResult {
  value: string;
  files: { [fileName: string]: string };
}

interface RuntimeHashResult {
  value: string;
  runtime: { [input: string]: string };
}

export class Hasher {
  static version = '2.0';
  private implicitDependencies: Promise<ImplicitHashResult>;
  private runtimeInputs: Promise<RuntimeHashResult>;
  private fileHasher: FileHasher;
  private projectHashes: ProjectHasher;
  private hashing: HashingImpl;

  constructor(
    private readonly projectGraph: ProjectGraph,
    private readonly nxJson: NxJsonConfiguration,
    private readonly options: any,
    hashing: HashingImpl = undefined
  ) {
    if (!hashing) {
      this.hashing = defaultHashing;
      this.fileHasher = defaultFileHasher;
    } else {
      // this is only used for testing
      this.hashing = hashing;
      this.fileHasher = new FileHasher(hashing);
      this.fileHasher.clear();
    }
    this.projectHashes = new ProjectHasher(this.projectGraph, this.hashing);
  }

  async hashTaskWithDepsAndContext(task: Task): Promise<Hash> {
    const command = this.hashCommand(task);

    const values = (await Promise.all([
      this.projectHashes.hashProject(task.target.project, [
        task.target.project,
      ]),
      this.implicitDepsHash(),
      this.runtimeInputsHash(),
    ])) as [
      ProjectHashResult,
      ImplicitHashResult,
      RuntimeHashResult
      // NodeModulesResult
    ];

    const value = this.hashing.hashArray([
      Hasher.version,
      command,
      ...values.map((v) => v.value),
    ]);

    return {
      value,
      details: {
        command,
        nodes: values[0].nodes,
        implicitDeps: values[1].files,
        runtime: values[2].runtime,
      },
    };
  }

  hashCommand(task: Task) {
    return this.hashing.hashArray([
      task.target.project ?? '',
      task.target.target ?? '',
      task.target.configuration ?? '',
      JSON.stringify(task.overrides),
    ]);
  }

  async hashContext(): Promise<{
    implicitDeps: ImplicitHashResult;
    runtime: RuntimeHashResult;
  }> {
    const values = (await Promise.all([
      this.implicitDepsHash(),
      this.runtimeInputsHash(),
    ])) as [ImplicitHashResult, RuntimeHashResult];

    return {
      implicitDeps: values[0],
      runtime: values[1],
    };
  }

  async hashSource(task: Task): Promise<string> {
    return this.projectHashes.hashProjectNodeSource(task.target.project);
  }

  hashArray(values: string[]): string {
    return this.hashing.hashArray(values);
  }

  private async runtimeInputsHash(): Promise<RuntimeHashResult> {
    if (this.runtimeInputs) return this.runtimeInputs;

    performance.mark('hasher:runtime inputs hash:start');

    this.runtimeInputs = new Promise(async (res, rej) => {
      const inputs =
        this.options && this.options.runtimeCacheInputs
          ? this.options.runtimeCacheInputs
          : [];
      if (inputs.length > 0) {
        try {
          const values = (await Promise.all(
            inputs.map(
              (input) =>
                new Promise((res, rej) => {
                  exec(input, (err, stdout, stderr) => {
                    if (err) {
                      rej(err);
                    } else {
                      res({ input, value: `${stdout}${stderr}`.trim() });
                    }
                  });
                })
            )
          )) as any;

          const value = this.hashing.hashArray(values.map((v) => v.value));
          const runtime = values.reduce(
            (m, c) => ((m[c.input] = c.value), m),
            {}
          );

          performance.mark('hasher:runtime inputs hash:end');
          performance.measure(
            'hasher:runtime inputs hash',
            'hasher:runtime inputs hash:start',
            'hasher:runtime inputs hash:end'
          );
          res({ value, runtime });
        } catch (e) {
          rej(
            new Error(
              `Nx failed to execute runtimeCacheInputs defined in nx.json failed:\n${e.message}`
            )
          );
        }
      } else {
        res({ value: '', runtime: {} });
      }
    });

    return this.runtimeInputs;
  }

  private async implicitDepsHash(): Promise<ImplicitHashResult> {
    if (this.implicitDependencies) return this.implicitDependencies;

    performance.mark('hasher:implicit deps hash:start');

    this.implicitDependencies = new Promise((res) => {
      const implicitDeps = Object.keys(this.nxJson.implicitDependencies ?? {});
      const filesWithoutPatterns = implicitDeps.filter(
        (p) => p.indexOf('*') === -1
      );
      const patterns = implicitDeps.filter((p) => p.indexOf('*') !== -1);

      const implicitDepsFromPatterns =
        patterns.length > 0
          ? (this.projectGraph.allWorkspaceFiles ?? [])
              .filter(
                (f) => !!patterns.find((pattern) => minimatch(f.file, pattern))
              )
              .map((f) => f.file)
          : [];

      const fileNames = [
        ...filesWithoutPatterns,
        ...implicitDepsFromPatterns,

        //TODO: vsavkin move the special cases into explicit ts support
        'tsconfig.base.json',
        'package-lock.json',
        'yarn.lock',
        'pnpm-lock.yaml',

        // ignore files will change the set of inputs to the hasher
        '.gitignore',
        '.nxignore',
      ];

      const fileHashes = [
        ...fileNames.map((file) => {
          const hash = this.fileHasher.hashFile(file);
          return { file, hash };
        }),
        ...this.hashGlobalConfig(),
      ];
      const combinedHash = this.hashing.hashArray(
        fileHashes.map((v) => v.hash)
      );

      performance.mark('hasher:implicit deps hash:end');
      performance.measure(
        'hasher:implicit deps hash',
        'hasher:implicit deps hash:start',
        'hasher:implicit deps hash:end'
      );

      res({
        value: combinedHash,
        files: fileHashes.reduce((m, c) => ((m[c.file] = c.hash), m), {}),
      });
    });

    return this.implicitDependencies;
  }

  private hashGlobalConfig() {
    return [
      {
        hash: this.fileHasher.hashFile('nx.json', (file) => {
          try {
            const r = parseJson(file);
            delete r.projects;
            return JSON.stringify(r);
          } catch {
            return '';
          }
        }),
        file: 'nx.json',
      },
    ];
  }
}

class ProjectHasher {
  private sourceHashes: { [projectName: string]: Promise<string> } = {};
  private workspaceJson: WorkspaceJsonConfiguration;
  private nxJson: NxJsonConfiguration;

  constructor(
    private readonly projectGraph: ProjectGraph,
    private readonly hashing: HashingImpl
  ) {
    this.workspaceJson = this.readWorkspaceConfigFile(workspaceFileName());
    this.nxJson = this.readNxJsonConfigFile('nx.json');
  }

  async hashProject(
    projectName: string,
    visited: string[]
  ): Promise<ProjectHashResult> {
    return Promise.resolve().then(async () => {
      const deps = this.projectGraph.dependencies[projectName] ?? [];
      const depHashes = (
        await Promise.all(
          deps.map(async (d) => {
            if (visited.indexOf(d.target) > -1) {
              return null;
            } else {
              visited.push(d.target);
              return await this.hashProject(d.target, visited);
            }
          })
        )
      ).filter((r) => !!r);
      const projectHash = await this.hashProjectNodeSource(projectName);
      const nodes = depHashes.reduce(
        (m, c) => {
          return { ...m, ...c.nodes };
        },
        { [projectName]: projectHash }
      );
      const value = this.hashing.hashArray([
        ...depHashes.map((d) => d.value),
        projectHash,
      ]);
      return { value, nodes };
    });
  }

  async hashProjectNodeSource(projectName: string) {
    if (!this.sourceHashes[projectName]) {
      this.sourceHashes[projectName] = new Promise(async (res) => {
        const p = this.projectGraph.nodes[projectName];
        const fileNames = p.data.files.map((f) => f.file);
        const values = p.data.files.map((f) => f.hash);

        const workspaceJson = JSON.stringify(
          this.workspaceJson.projects[projectName] ?? ''
        );
        const nxJson = JSON.stringify(this.nxJson.projects[projectName] ?? '');

        res(
          this.hashing.hashArray([
            ...fileNames,
            ...values,
            workspaceJson,
            nxJson,
          ])
        );
      });
    }
    return this.sourceHashes[projectName];
  }

  private readWorkspaceConfigFile(path: string): WorkspaceJsonConfiguration {
    try {
      const res = readJsonFile(path);
      res.projects ??= {};
      return resolveNewFormatWithInlineProjects(res);
    } catch {
      return { projects: {}, version: 2 };
    }
  }

  private readNxJsonConfigFile(path: string): NxJsonConfiguration {
    try {
      const res = readJsonFile(path);
      res.projects ??= {};
      return res;
    } catch {
      return { projects: {}, npmScope: '' };
    }
  }
}
