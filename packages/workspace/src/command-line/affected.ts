import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as resolve from 'resolve';
import * as runAll from 'npm-run-all';
import * as yargs from 'yargs';

import {
  getAffectedApps,
  getAffectedLibs,
  getAffectedProjects,
  getAllAppNames,
  getAllLibNames,
  getProjectNames,
  parseFiles,
  getAllProjectNamesWithTarget,
  getAffectedProjectsWithTarget
} from './shared';
import { generateGraph } from './dep-graph';
import { GlobalNxArgs } from './nx';
import { WorkspaceResults } from './workspace-results';

export interface YargsAffectedOptions
  extends yargs.Arguments,
    AffectedOptions {}

export interface AffectedOptions extends GlobalNxArgs {
  target?: string;
  parallel?: boolean;
  maxParallel?: number;
  untracked?: boolean;
  uncommitted?: boolean;
  all?: boolean;
  base?: string;
  head?: string;
  exclude?: string[];
  files?: string[];
  onlyFailed?: boolean;
  'only-failed'?: boolean;
  'max-parallel'?: boolean;
}

// Commands that can do `ng [command]`
const ngCommands = ['build', 'test', 'lint', 'e2e'];

export function affected(parsedArgs: YargsAffectedOptions): void {
  const target = parsedArgs.target;
  const rest: string[] = [
    ...parsedArgs._.slice(1),
    ...filterNxSpecificArgs(parsedArgs)
  ];

  const workspaceResults = new WorkspaceResults(target);

  try {
    switch (target) {
      case 'apps':
        const apps = (parsedArgs.all
          ? getAllAppNames()
          : getAffectedApps(parseFiles(parsedArgs).files)
        )
          .filter(app => !parsedArgs.exclude.includes(app))
          .filter(
            project =>
              !parsedArgs.onlyFailed || !workspaceResults.getResult(project)
          );
        console.log(apps.join(' '));
        break;
      case 'libs':
        const libs = (parsedArgs.all
          ? getAllLibNames()
          : getAffectedLibs(parseFiles(parsedArgs).files)
        )
          .filter(app => !parsedArgs.exclude.includes(app))
          .filter(
            project =>
              !parsedArgs.onlyFailed || !workspaceResults.getResult(project)
          );
        console.log(libs.join(' '));
        break;
      case 'dep-graph':
        const projects = parsedArgs.all
          ? getProjectNames()
          : getAffectedProjects(parseFiles(parsedArgs).files)
              .filter(app => !parsedArgs.exclude.includes(app))
              .filter(
                project =>
                  !parsedArgs.onlyFailed || !workspaceResults.getResult(project)
              );
        generateGraph(parsedArgs, projects);
        break;
      default:
        const targetProjects = getProjects(
          target,
          parsedArgs,
          workspaceResults,
          parsedArgs.all
        );
        runCommand(
          target,
          targetProjects,
          parsedArgs,
          rest,
          workspaceResults,
          `Running ${target} for`,
          `Running ${target} for affected projects succeeded.`,
          `Running ${target} for affected projects failed.`
        );
        break;
    }
  } catch (e) {
    printError(e);
    process.exit(1);
  }
}

function getProjects(
  target: string,
  parsedArgs: YargsAffectedOptions,
  workspaceResults: WorkspaceResults,
  all: boolean
) {
  const projects = all
    ? getAllProjectNamesWithTarget(target)
    : getAffectedProjectsWithTarget(target)(parseFiles(parsedArgs).files);

  return projects
    .filter(project => !parsedArgs.exclude.includes(project))
    .filter(
      project => !parsedArgs.onlyFailed || !workspaceResults.getResult(project)
    );
}

function printError(e: any) {
  console.error(e.message);
}

async function runCommand(
  command: string,
  projects: string[],
  parsedArgs: YargsAffectedOptions,
  args: string[],
  workspaceResults: WorkspaceResults,
  iterationMessage: string,
  successMessage: string,
  errorMessage: string
) {
  if (projects.length <= 0) {
    console.log(`No projects to run ${command}`);
    return;
  }

  let message = `${iterationMessage} projects:\n  ${projects.join(',\n  ')}`;
  console.log(message);
  if (args.length > 0) {
    console.log(`With flags: ${args.join(' ')}`);
  }
  if (parsedArgs.parallel) {
    // Make sure the `package.json` has the `ng: "ng"` command needed by `npm-run-all`
    const packageJson = JSON.parse(
      fs.readFileSync('./package.json').toString('utf-8')
    );
    if (!packageJson.scripts || !packageJson.scripts.ng) {
      console.error(
        '\nError: Your `package.json` file should contain the `ng: "ng"` command in the `scripts` section.\n'
      );
      return process.exit(1);
    }
    try {
      await runAll(
        projects.map(app => {
          return ngCommands.includes(command)
            ? `ng -- ${command} --project=${app} ${args.join(' ')} `
            : `ng -- run ${app}:${command} ${args.join(' ')} `;
        }),
        {
          parallel: parsedArgs.parallel,
          maxParallel: parsedArgs.maxParallel,
          continueOnError: true,
          stdin: process.stdin,
          stdout: process.stdout,
          stderr: process.stderr
        }
      );
      projects.forEach(project => {
        workspaceResults.success(project);
      });
    } catch (e) {
      e.results.forEach((result, i) => {
        if (result.code === 0) {
          workspaceResults.success(projects[i]);
        } else {
          workspaceResults.fail(projects[i]);
        }
      });
    }
    workspaceResults.saveResults();
    workspaceResults.printResults(
      parsedArgs.onlyFailed,
      successMessage,
      errorMessage
    );

    if (workspaceResults.hasFailure) {
      process.exit(1);
    }
  } else {
    let failedProjects = [];
    projects.forEach(project => {
      console.log(`${iterationMessage} ${project}`);
      const task = ngCommands.includes(command)
        ? `node ${ngPath()} ${command} --project=${project} ${args.join(' ')} `
        : `node ${ngPath()} run ${project}:${command} ${args.join(' ')} `;
      try {
        execSync(task, {
          stdio: [0, 1, 2]
        });
        workspaceResults.success(project);
      } catch (e) {
        failedProjects.push(project);
        workspaceResults.fail(project);
      }
    });

    workspaceResults.saveResults();
    workspaceResults.printResults(
      parsedArgs.onlyFailed,
      successMessage,
      errorMessage
    );

    if (workspaceResults.hasFailure) {
      process.exit(1);
    }
  }
}

function filterNxSpecificArgs(parsedArgs: YargsAffectedOptions): string[] {
  const filteredArgs = { ...parsedArgs };
  // Delete Nx arguments from parsed Args
  nxSpecificFlags.forEach(flag => {
    delete filteredArgs[flag];
  });

  // These would be arguments such as app2 in  --app app1 app2 which the CLI does not accept
  delete filteredArgs._;
  // Also remove the node path
  delete filteredArgs.$0;

  // Re-serialize into a list of args
  return Object.keys(filteredArgs).map(filteredArg => {
    if (!Array.isArray(filteredArgs[filteredArg])) {
      filteredArgs[filteredArg] = [filteredArgs[filteredArg]];
    }

    return filteredArgs[filteredArg]
      .map(value => {
        return `--${filteredArg}=${value}`;
      })
      .join(' ');
  });
}

function ngPath() {
  const basePath = path.dirname(
    path.dirname(
      path.dirname(resolve.sync('@angular/cli', { basedir: __dirname }))
    )
  );
  return `"${path.join(basePath, 'bin', 'ng')}"`;
}

/**
 * These options are only for getting an array with properties of AffectedOptions.
 *
 * @remark They are not defaults or useful for anything else
 */
const dummyOptions: AffectedOptions = {
  target: '',
  parallel: false,
  maxParallel: 3,
  'max-parallel': false,
  onlyFailed: false,
  'only-failed': false,
  untracked: false,
  uncommitted: false,
  help: false,
  version: false,
  quiet: false,
  all: false,
  base: 'base',
  head: 'head',
  exclude: ['exclude'],
  files: ['']
};

const nxSpecificFlags = Object.keys(dummyOptions);
