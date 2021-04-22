import { Task } from './tasks-runner';

export interface ReporterArgs {
  target?: string;
  configuration?: string;
  onlyFailed?: boolean;
}

export abstract class Reporter {
  abstract beforeRun(
    projectNames: string[],
    tasks: Task[],
    args: ReporterArgs,
    taskOverrides: any
  ): void;

  abstract printResults(
    nxArgs: ReporterArgs,
    failedProjects: string[],
    startedWithFailedProjects: boolean,
    tasks: Task[],
    failedTasks: Task[],
    cachedTasks: Task[]
  ): void;
}
