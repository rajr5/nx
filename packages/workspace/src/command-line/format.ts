import { execSync } from 'child_process';
import * as path from 'path';
import { getProjectRoots, parseFiles } from './shared';
import { fileExists } from '../utilities/fileutils';
import {
  createProjectGraph,
  onlyWorkspaceProjects,
} from '../core/project-graph';
import { filterAffected } from '../core/affected-project-graph';
import { calculateFileChanges } from '../core/file-utils';
import * as yargs from 'yargs';
import { NxArgs, splitArgsIntoNxArgsAndOverrides } from './utils';
import {
  reformattedWorkspaceJsonOrNull,
  workspaceConfigName,
} from '@nrwl/tao/src/shared/workspace';
import { appRootPath } from '@nrwl/workspace/src/utilities/app-root';
import * as prettier from 'prettier';
import { readJsonFile, writeJsonFile } from '@nrwl/devkit';
import { sortObjectByKeys } from '@nrwl/tao/src/utils/object-sort';

const PRETTIER_PATH = require.resolve('prettier/bin-prettier');

export function format(
  command: 'check' | 'write',
  args: yargs.Arguments
): void {
  const { nxArgs } = splitArgsIntoNxArgsAndOverrides(args, 'affected');
  const workspaceJsonPath = workspaceConfigName(appRootPath);
  const patterns = getPatterns({ ...args, ...nxArgs } as any).map(
    (p) => `"${p}"`
  );

  // Chunkify the patterns array to prevent crashing the windows terminal
  const chunkList: string[][] = chunkify(patterns, 50);

  switch (command) {
    case 'write':
      updateWorkspaceJsonToMatchFormatVersion();
      sortWorkspaceJson();
      sortNxJson();
      sortTsConfig();
      chunkList.push([workspaceJsonPath, 'nx.json', 'tsconfig.base.json']);
      chunkList.forEach((chunk) => write(chunk));
      break;
    case 'check':
      chunkList.forEach((chunk) => check(chunk));
      break;
  }
}

function getPatterns(
  args: NxArgs & { libsAndApps: boolean; _: string[] }
): string[] {
  const supportedExtensions = prettier
    .getSupportInfo()
    .languages.flatMap((language) => language.extensions)
    .filter((extension) => !!extension);
  const matchAllPattern = `**/*{${supportedExtensions.join(',')}}`;
  const allFilesPattern = [matchAllPattern];

  if (args.all) {
    return allFilesPattern;
  }

  try {
    if (args.projects && args.projects.length > 0) {
      return getPatternsFromProjects(args.projects, matchAllPattern);
    }

    const p = parseFiles(args);
    const patterns = p.files.filter(
      (f) => fileExists(f) && supportedExtensions.includes(path.extname(f))
    );

    return args.libsAndApps
      ? getPatternsFromApps(patterns, matchAllPattern)
      : patterns;
  } catch {
    return allFilesPattern;
  }
}

function getPatternsFromApps(
  affectedFiles: string[],
  matchAllPattern: string
): string[] {
  const graph = onlyWorkspaceProjects(createProjectGraph());
  const affectedGraph = filterAffected(
    graph,
    calculateFileChanges(affectedFiles)
  );
  return getPatternsFromProjects(
    Object.keys(affectedGraph.nodes),
    matchAllPattern
  );
}

function getPatternsFromProjects(
  projects: string[],
  matchAllPattern: string
): string[] {
  const roots = getProjectRoots(projects);
  return roots.map((root) => `${root}/${matchAllPattern}`);
}

function chunkify(target: string[], size: number): string[][] {
  return target.reduce((current: string[][], value: string, index: number) => {
    if (index % size === 0) current.push([]);
    current[current.length - 1].push(value);
    return current;
  }, []);
}

function write(patterns: string[]) {
  if (patterns.length > 0) {
    execSync(`node "${PRETTIER_PATH}" --write ${patterns.join(' ')}`, {
      stdio: [0, 1, 2],
    });
  }
}

function check(patterns: string[]) {
  if (patterns.length > 0) {
    try {
      execSync(
        `node "${PRETTIER_PATH}" --list-different ${patterns.join(' ')}`,
        {
          stdio: [0, 1, 2],
        }
      );
    } catch {
      process.exit(1);
    }
  }
}

function updateWorkspaceJsonToMatchFormatVersion() {
  const workspaceConfig = workspaceConfigName(appRootPath);
  try {
    const workspaceJson = readJsonFile(workspaceConfig);
    const reformatted = reformattedWorkspaceJsonOrNull(workspaceJson);
    if (reformatted) {
      writeJsonFile(workspaceConfig, reformatted);
    }
  } catch (e) {
    console.error(`Failed to format: ${path}`);
    console.error(e);
  }
}

function sortWorkspaceJson() {
  const workspaceJsonPath = workspaceConfigName(appRootPath);
  try {
    const workspaceJson = readJsonFile(workspaceJsonPath);
    if (Object.entries(workspaceJson.projects).length !== 0) {
      const sortedProjects = sortObjectByKeys(workspaceJson.projects);
      workspaceJson.projects = sortedProjects;
      writeJsonFile(workspaceJsonPath, workspaceJson);
    }
  } catch (e) {
    // catch noop
  }
}

function sortNxJson() {
  try {
    const nxJsonPath = path.join(appRootPath, 'nx.json');
    const nxJson = readJsonFile(nxJsonPath);
    const sortedProjects = sortObjectByKeys(nxJson.projects);
    nxJson.projects = sortedProjects;
    writeJsonFile(nxJsonPath, nxJson);
  } catch (e) {
    // catch noop
  }
}

function sortTsConfig() {
  try {
    const tsconfigPath = path.join(appRootPath, 'tsconfig.base.json');
    const tsconfig = readJsonFile(tsconfigPath);
    const sortedPaths = sortObjectByKeys(tsconfig.compilerOptions.paths);
    tsconfig.compilerOptions.paths = sortedPaths;
    writeJsonFile(tsconfigPath, tsconfig);
  } catch (e) {
    // catch noop
  }
}
