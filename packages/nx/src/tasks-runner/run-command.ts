import { TasksRunner, TaskStatus } from './tasks-runner';
import { join } from 'path';
import { workspaceRoot } from '../utils/app-root';
import { NxArgs } from '../utils/command-line-utils';
import { isRelativePath } from '../utils/fileutils';
import {
  projectHasTarget,
  projectHasTargetAndConfiguration,
} from '../utils/project-graph-utils';
import { output } from '../utils/output';
import { getDependencyConfigs, shouldStreamOutput } from './utils';
import { CompositeLifeCycle, LifeCycle } from './life-cycle';
import { StaticRunManyTerminalOutputLifeCycle } from './life-cycles/static-run-many-terminal-output-life-cycle';
import { StaticRunOneTerminalOutputLifeCycle } from './life-cycles/static-run-one-terminal-output-life-cycle';
import { TaskTimingsLifeCycle } from './life-cycles/task-timings-life-cycle';
import { createRunManyDynamicOutputRenderer } from './life-cycles/dynamic-run-many-terminal-output-life-cycle';
import { TaskProfilingLifeCycle } from './life-cycles/task-profiling-life-cycle';
import { isCI } from '../utils/is-ci';
import { createRunOneDynamicOutputRenderer } from './life-cycles/dynamic-run-one-terminal-output-life-cycle';
import { ProjectGraph, ProjectGraphProjectNode } from '../config/project-graph';
import { NxJsonConfiguration } from '../config/nx-json';
import { Task } from '../config/task-graph';
import {
  ProjectConfiguration,
  TargetDependencyConfig,
} from '../config/workspace-json-project-json';

async function getTerminalOutputLifeCycle(
  initiatingProject: string,
  projectNames: string[],
  tasks: Task[],
  nxArgs: NxArgs,
  overrides: Record<string, unknown>,
  runnerOptions: any
): Promise<{ lifeCycle: LifeCycle; renderIsDone: Promise<void> }> {
  const isRunOne = initiatingProject != null;
  const useDynamicOutput =
    shouldUseDynamicLifeCycle(tasks, runnerOptions, nxArgs.outputStyle) &&
    process.env.NX_VERBOSE_LOGGING !== 'true' &&
    process.env.NX_TASKS_RUNNER_DYNAMIC_OUTPUT !== 'false';

  if (isRunOne) {
    if (useDynamicOutput) {
      return await createRunOneDynamicOutputRenderer({
        initiatingProject,
        tasks,
        args: nxArgs,
        overrides,
      });
    }
    return {
      lifeCycle: new StaticRunOneTerminalOutputLifeCycle(
        initiatingProject,
        projectNames,
        tasks,
        nxArgs
      ),
      renderIsDone: Promise.resolve(),
    };
  } else {
    if (useDynamicOutput) {
      return await createRunManyDynamicOutputRenderer({
        projectNames,
        tasks,
        args: nxArgs,
        overrides,
      });
    } else {
      return {
        lifeCycle: new StaticRunManyTerminalOutputLifeCycle(
          projectNames,
          tasks,
          nxArgs,
          overrides
        ),
        renderIsDone: Promise.resolve(),
      };
    }
  }
}

export async function runCommand(
  projectsToRun: ProjectGraphProjectNode[],
  projectGraph: ProjectGraph,
  { nxJson }: { nxJson: NxJsonConfiguration },
  nxArgs: NxArgs,
  overrides: any,
  initiatingProject: string | null
) {
  const { tasksRunner, runnerOptions } = getRunner(nxArgs, nxJson);

  const defaultDependencyConfigs = nxJson.targetDependencies;
  const tasks = createTasksForProjectToRun(
    projectsToRun,
    {
      target: nxArgs.target,
      configuration: nxArgs.configuration,
      overrides,
    },
    projectGraph,
    initiatingProject,
    defaultDependencyConfigs
  );

  const projectNames = projectsToRun.map((t) => t.name);
  if (nxArgs.outputStyle == 'stream') {
    process.env.NX_STREAM_OUTPUT = 'true';
    process.env.NX_PREFIX_OUTPUT = 'true';
  }
  if (nxArgs.outputStyle == 'stream-without-prefixes') {
    process.env.NX_STREAM_OUTPUT = 'true';
  }
  const { lifeCycle, renderIsDone } = await getTerminalOutputLifeCycle(
    initiatingProject,
    projectNames,
    tasks,
    nxArgs,
    overrides,
    runnerOptions
  );
  const lifeCycles = [lifeCycle] as LifeCycle[];

  if (process.env.NX_PERF_LOGGING) {
    lifeCycles.push(new TaskTimingsLifeCycle());
  }

  if (process.env.NX_PROFILE) {
    lifeCycles.push(new TaskProfilingLifeCycle(process.env.NX_PROFILE));
  }

  const promiseOrObservable = tasksRunner(
    tasks,
    { ...runnerOptions, lifeCycle: new CompositeLifeCycle(lifeCycles) },
    {
      initiatingProject:
        nxArgs.outputStyle === 'compact' ? null : initiatingProject,
      target: nxArgs.target,
      projectGraph,
      nxJson,
    }
  );

  let anyFailures;
  try {
    if ((promiseOrObservable as any).subscribe) {
      anyFailures = await anyFailuresInObservable(promiseOrObservable);
    } else {
      // simply await the promise
      anyFailures = await anyFailuresInPromise(promiseOrObservable as any);
    }
    await renderIsDone;
  } catch (e) {
    output.error({
      title: 'Unhandled error in task executor',
    });
    console.error(e);
    process.exit(1);
  }

  // fix for https://github.com/nrwl/nx/issues/1666
  if (process.stdin['unref']) (process.stdin as any).unref();

  process.exit(anyFailures ? 1 : 0);
}

async function anyFailuresInPromise(
  promise: Promise<{ [id: string]: TaskStatus }>
) {
  return Object.values(await promise).some(
    (v) => v === 'failure' || v === 'skipped'
  );
}

async function anyFailuresInObservable(obs: any) {
  return await new Promise((res) => {
    let anyFailures = false;
    obs.subscribe(
      (t) => {
        if (!t.success) {
          anyFailures = true;
        }
      },
      (error) => {
        output.error({
          title: 'Unhandled error in task executor',
        });
        console.error(error);
        res(true);
      },
      () => {
        res(anyFailures);
      }
    );
  });
}

interface TaskParams {
  project: ProjectGraphProjectNode;
  target: string;
  configuration: string;
  overrides: Object;
  errorIfCannotFindConfiguration: boolean;
}

export function createTasksForProjectToRun(
  projectsToRun: ProjectGraphProjectNode[],
  params: Omit<TaskParams, 'project' | 'errorIfCannotFindConfiguration'>,
  projectGraph: ProjectGraph,
  initiatingProject: string | null,
  defaultDependencyConfigs: Record<
    string,
    (TargetDependencyConfig | string)[]
  > = {}
) {
  const tasksMap: Map<string, Task> = new Map<string, Task>();
  const seenSet = new Set<string>();

  for (const project of projectsToRun) {
    addTasksForProjectTarget(
      {
        project,
        ...params,
        errorIfCannotFindConfiguration: project.name === initiatingProject,
      },
      defaultDependencyConfigs,
      projectGraph,
      project.data.targets?.[params.target]?.executor,
      tasksMap,
      [],
      seenSet
    );
  }
  return Array.from(tasksMap.values());
}

function shouldUseDynamicLifeCycle(
  tasks: Task[],
  options: any,
  outputStyle: string
) {
  if (!process.stdout.isTTY) return false;
  if (isCI()) return false;
  if (outputStyle === 'static' || outputStyle === 'stream') return false;

  const noForwarding = !tasks.find((t) => shouldStreamOutput(t, null, options));
  return noForwarding;
}

function addTasksForProjectTarget(
  {
    project,
    target,
    configuration,
    overrides,
    errorIfCannotFindConfiguration,
  }: TaskParams,
  defaultDependencyConfigs: Record<
    string,
    (TargetDependencyConfig | string)[]
  > = {},
  projectGraph: ProjectGraph,
  originalTargetExecutor: string,
  tasksMap: Map<string, Task>,
  path: { targetIdentifier: string; hasTarget: boolean }[],
  seenSet: Set<string>
) {
  const task = createTask({
    project,
    target,
    configuration,
    overrides:
      project.data.targets?.[target]?.executor === originalTargetExecutor
        ? overrides
        : {},
    errorIfCannotFindConfiguration,
  });

  const dependencyConfigs = getDependencyConfigs(
    { project: project.name, target },
    defaultDependencyConfigs,
    projectGraph
  );

  if (dependencyConfigs) {
    for (const dependencyConfig of dependencyConfigs) {
      addTasksForProjectDependencyConfig(
        project,
        {
          target,
          configuration,
          overrides,
        },
        dependencyConfig,
        defaultDependencyConfigs,
        projectGraph,
        originalTargetExecutor,
        tasksMap,
        path,
        seenSet
      );
    }
  }
  tasksMap.set(task.id, task);
}

export function createTask({
  project,
  target,
  configuration,
  overrides,
  errorIfCannotFindConfiguration,
}: TaskParams): Task {
  if (!projectHasTarget(project, target)) {
    output.error({
      title: `Cannot find target '${target}' for project '${project.name}'`,
    });
    process.exit(1);
  }

  configuration ??= project.data.targets?.[target]?.defaultConfiguration;

  const config = projectHasTargetAndConfiguration(
    project,
    target,
    configuration
  )
    ? configuration
    : undefined;

  if (errorIfCannotFindConfiguration && configuration && !config) {
    output.error({
      title: `Cannot find configuration '${configuration}' for project '${project.name}:${target}'`,
    });
    process.exit(1);
  }

  const qualifiedTarget = {
    project: project.name,
    target,
    configuration: config,
  };
  return {
    id: getId(qualifiedTarget),
    target: qualifiedTarget,
    projectRoot: project.data.root,
    overrides: interpolateOverrides(overrides, project.name, project.data),
  };
}

function addTasksForProjectDependencyConfig(
  project: ProjectGraphProjectNode<ProjectConfiguration>,
  {
    target,
    configuration,
    overrides,
  }: Pick<TaskParams, 'target' | 'configuration' | 'overrides'>,
  dependencyConfig: TargetDependencyConfig,
  defaultDependencyConfigs: Record<string, (TargetDependencyConfig | string)[]>,
  projectGraph: ProjectGraph,
  originalTargetExecutor: string,
  tasksMap: Map<string, Task>,
  path: { targetIdentifier: string; hasTarget: boolean }[],
  seenSet: Set<string>
) {
  const targetIdentifier = getId({
    project: project.name,
    target,
    configuration,
  });

  const pathFragment = {
    targetIdentifier,
    hasTarget: projectHasTarget(project, target),
  };

  const newPath = [...path, pathFragment];
  seenSet.add(targetIdentifier);

  if (tasksMap.has(targetIdentifier)) {
    return;
  }

  if (dependencyConfig.projects === 'dependencies') {
    const dependencies = projectGraph.dependencies[project.name];
    if (dependencies) {
      for (const dep of dependencies) {
        const depProject = projectGraph.nodes[
          dep.target
        ] as ProjectGraphProjectNode;

        if (
          depProject &&
          projectHasTarget(depProject, dependencyConfig.target)
        ) {
          const depTargetId = getId({
            project: depProject.name,
            target: dependencyConfig.target,
            configuration: configuration,
          });
          exitOnCircularDep(newPath, depTargetId);
          if (seenSet.has(depTargetId)) {
            continue;
          }

          addTasksForProjectTarget(
            {
              project: depProject,
              target: dependencyConfig.target,
              configuration,
              overrides,
              errorIfCannotFindConfiguration: false,
            },
            defaultDependencyConfigs,
            projectGraph,
            originalTargetExecutor,
            tasksMap,
            newPath,
            seenSet
          );
        } else {
          if (!depProject) {
            continue;
          }
          const depTargetId = getId({
            project: depProject.name,
            target: dependencyConfig.target,
            configuration: configuration,
          });

          exitOnCircularDep(newPath, depTargetId);

          if (seenSet.has(depTargetId)) {
            continue;
          }

          addTasksForProjectDependencyConfig(
            depProject,
            { target, configuration, overrides },
            dependencyConfig,
            defaultDependencyConfigs,
            projectGraph,
            originalTargetExecutor,
            tasksMap,
            newPath,
            seenSet
          );
        }
      }
    }
  } else if (projectHasTarget(project, dependencyConfig.target)) {
    addTasksForProjectTarget(
      {
        project,
        target: dependencyConfig.target,
        configuration,
        overrides,
        errorIfCannotFindConfiguration: false,
      },
      defaultDependencyConfigs,
      projectGraph,
      originalTargetExecutor,
      tasksMap,
      newPath,
      seenSet
    );
  }
}

function exitOnCircularDep(
  path: { targetIdentifier: string; hasTarget: boolean }[],
  targetIdentifier: string
) {
  if (
    path.length > 0 &&
    path[path.length - 1].hasTarget &&
    path.filter((p) => p.targetIdentifier === targetIdentifier).length > 0
  ) {
    const identifiers = path.map((p) => p.targetIdentifier);
    output.error({
      title: `Could not execute ${identifiers[0]} because it has a circular dependency`,
      bodyLines: [`${[...identifiers, targetIdentifier].join(' --> ')}`],
    });
    process.exit(1);
  }
}

function getId({
  project,
  target,
  configuration,
}: {
  project: string;
  target: string;
  configuration?: string;
}): string {
  let id = `${project}:${target}`;
  if (configuration) {
    id += `:${configuration}`;
  }
  return id;
}

export function getRunner(
  nxArgs: NxArgs,
  nxJson: NxJsonConfiguration
): {
  tasksRunner: TasksRunner;
  runnerOptions: any;
} {
  let runner = nxArgs.runner;

  //TODO: vsavkin remove in Nx 12
  if (!nxJson.tasksRunnerOptions) {
    const t = require('./default-tasks-runner');
    return {
      tasksRunner: t.defaultTasksRunner,
      runnerOptions: nxArgs,
    };
  }

  //TODO: vsavkin remove in Nx 12
  if (!runner && !nxJson.tasksRunnerOptions.default) {
    const t = require('./default-tasks-runner');
    return {
      tasksRunner: t.defaultTasksRunner,
      runnerOptions: nxArgs,
    };
  }

  runner = runner || 'default';

  if (nxJson.tasksRunnerOptions[runner]) {
    let modulePath: string = nxJson.tasksRunnerOptions[runner].runner;

    let tasksRunner;
    if (modulePath) {
      if (isRelativePath(modulePath)) {
        modulePath = join(workspaceRoot, modulePath);
      }

      tasksRunner = require(modulePath);
      // to support both babel and ts formats
      if (tasksRunner.default) {
        tasksRunner = tasksRunner.default;
      }
    } else {
      tasksRunner = require('./default-tasks-runner').defaultTasksRunner;
    }

    return {
      tasksRunner,
      runnerOptions: {
        ...nxJson.tasksRunnerOptions[runner].options,
        ...nxArgs,
      },
    };
  } else {
    output.error({
      title: `Could not find runner configuration for ${runner}`,
    });
    process.exit(1);
  }
}

function interpolateOverrides<T = any>(
  args: T,
  projectName: string,
  projectMetadata: any
): T {
  const interpolatedArgs: T = { ...args };
  Object.entries(interpolatedArgs).forEach(([name, value]) => {
    if (typeof value === 'string') {
      const regex = /{project\.([^}]+)}/g;
      interpolatedArgs[name] = value.replace(regex, (_, group: string) => {
        if (group.includes('.')) {
          throw new Error('Only top-level properties can be interpolated');
        }

        if (group === 'name') {
          return projectName;
        }
        return projectMetadata[group];
      });
    }
  });
  return interpolatedArgs;
}
