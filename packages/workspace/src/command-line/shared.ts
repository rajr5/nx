import { execSync } from 'child_process';
import * as path from 'path';
import {
  affectedAppNames,
  AffectedFetcher,
  affectedLibNames,
  affectedProjectNames,
  ProjectNode,
  ProjectType,
  affectedProjectNamesWithTarget
} from './affected-apps';
import * as fs from 'fs';
import * as appRoot from 'app-root-path';
import { readJsonFile } from '../utils/fileutils';
import { YargsAffectedOptions } from './affected';
import { readDependencies, DepGraph, Deps } from './deps-calculator';
import { touchedProjects } from './touched';

const ignore = require('ignore');

export type ImplicitDependencyEntry = { [key: string]: '*' | string[] };
export type NormalizedImplicitDependencyEntry = { [key: string]: string[] };
export type ImplicitDependencies = {
  files: NormalizedImplicitDependencyEntry;
  projects: NormalizedImplicitDependencyEntry;
};

export interface NxJson {
  implicitDependencies?: ImplicitDependencyEntry;
  npmScope: string;
  projects: {
    [projectName: string]: NxJsonProjectConfig;
  };
}

export interface NxJsonProjectConfig {
  implicitDependencies?: string[];
  tags?: string[];
}

function readFileIfExisting(path: string) {
  return fs.existsSync(path) ? fs.readFileSync(path, 'UTF-8').toString() : '';
}

const ig = ignore();
ig.add(readFileIfExisting(`${appRoot.path}/.gitignore`));

export function printArgsWarning(options: YargsAffectedOptions) {
  const { files, uncommitted, untracked, base, head } = options;

  if (
    !files &&
    !uncommitted &&
    !untracked &&
    !base &&
    !head &&
    options._.length < 2
  ) {
    console.log('Note: Nx defaulted to --base=master --head=HEAD');
  }
}

export function parseFiles(options: YargsAffectedOptions): { files: string[] } {
  const { files, uncommitted, untracked, base, head } = options;

  if (files) {
    return {
      files
    };
  } else if (uncommitted) {
    return {
      files: getUncommittedFiles()
    };
  } else if (untracked) {
    return {
      files: getUntrackedFiles()
    };
  } else if (base && head) {
    return {
      files: getFilesUsingBaseAndHead(base, head)
    };
  } else if (base) {
    return {
      files: Array.from(
        new Set([
          ...getFilesUsingBaseAndHead(base, 'HEAD'),
          ...getUncommittedFiles(),
          ...getUntrackedFiles()
        ])
      )
    };
  } else if (options._.length >= 2) {
    return {
      files: getFilesFromShash(options._[1], options._[2])
    };
  } else {
    return {
      files: Array.from(
        new Set([
          ...getFilesUsingBaseAndHead('master', 'HEAD'),
          ...getUncommittedFiles(),
          ...getUntrackedFiles()
        ])
      )
    };
  }
}

function getUncommittedFiles(): string[] {
  return parseGitOutput(`git diff --name-only HEAD .`);
}

function getUntrackedFiles(): string[] {
  return parseGitOutput(`git ls-files --others --exclude-standard`);
}

function getFilesUsingBaseAndHead(base: string, head: string): string[] {
  const mergeBase = execSync(`git merge-base ${base} ${head}`)
    .toString()
    .trim();
  return parseGitOutput(`git diff --name-only ${mergeBase} ${head}`);
}

function getFilesFromShash(sha1: string, sha2: string): string[] {
  return parseGitOutput(`git diff --name-only ${sha1} ${sha2}`);
}

function parseGitOutput(command: string): string[] {
  return execSync(command)
    .toString('utf-8')
    .split('\n')
    .map(a => a.trim())
    .filter(a => a.length > 0);
}

function getFileLevelImplicitDependencies(
  projects: ProjectNode[],
  nxJson: NxJson
): NormalizedImplicitDependencyEntry {
  if (!nxJson.implicitDependencies) {
    return {};
  }

  Object.entries<'*' | string[]>(nxJson.implicitDependencies).forEach(
    ([key, value]) => {
      if (value === '*') {
        nxJson.implicitDependencies[key] = projects.map(p => p.name);
      }
    }
  );
  return <NormalizedImplicitDependencyEntry>nxJson.implicitDependencies;
}

function getProjectLevelImplicitDependencies(
  projects: ProjectNode[]
): NormalizedImplicitDependencyEntry {
  const implicitDependencies = projects.reduce(
    (memo, project) => {
      project.implicitDependencies.forEach(dep => {
        if (memo[dep]) {
          memo[dep].add(project.name);
        } else {
          memo[dep] = new Set([project.name]);
        }
      });

      return memo;
    },
    {} as { [key: string]: Set<string> }
  );

  return Object.entries(implicitDependencies).reduce(
    (memo, [key, val]) => {
      memo[key] = Array.from(val);
      return memo;
    },
    {} as NormalizedImplicitDependencyEntry
  );
}

function detectAndSetInvalidProjectValues(
  map: Map<string, string[]>,
  sourceName: string,
  desiredProjectNames: string[],
  validProjects: any
) {
  const invalidProjects = desiredProjectNames.filter(
    projectName => !validProjects[projectName]
  );
  if (invalidProjects.length > 0) {
    map.set(sourceName, invalidProjects);
  }
}

export function getImplicitDependencies(
  projects: ProjectNode[],
  angularJson: any,
  nxJson: NxJson
): ImplicitDependencies {
  assertWorkspaceValidity(angularJson, nxJson);

  const implicitFileDeps = getFileLevelImplicitDependencies(projects, nxJson);
  const implicitProjectDeps = getProjectLevelImplicitDependencies(projects);

  return {
    files: implicitFileDeps,
    projects: implicitProjectDeps
  };
}

export function assertWorkspaceValidity(angularJson, nxJson) {
  const angularJsonProjects = Object.keys(angularJson.projects);
  const nxJsonProjects = Object.keys(nxJson.projects);

  if (minus(angularJsonProjects, nxJsonProjects).length > 0) {
    throw new Error(
      `angular.json and nx.json are out of sync. The following projects are missing in nx.json: ${minus(
        angularJsonProjects,
        nxJsonProjects
      ).join(', ')}`
    );
  }

  if (minus(nxJsonProjects, angularJsonProjects).length > 0) {
    throw new Error(
      `angular.json and nx.json are out of sync. The following projects are missing in angular.json: ${minus(
        nxJsonProjects,
        angularJsonProjects
      ).join(', ')}`
    );
  }

  const projects = {
    ...angularJson.projects,
    ...nxJson.projects
  };

  const invalidImplicitDependencies = new Map<string, string[]>();

  Object.entries<'*' | string[]>(nxJson.implicitDependencies || {})
    .filter(([_, val]) => val !== '*') // These are valid since it is calculated
    .reduce((map, [filename, projectNames]: [string, string[]]) => {
      detectAndSetInvalidProjectValues(map, filename, projectNames, projects);
      return map;
    }, invalidImplicitDependencies);

  nxJsonProjects
    .filter(nxJsonProjectName => {
      const project = nxJson.projects[nxJsonProjectName];
      return !!project.implicitDependencies;
    })
    .reduce((map, nxJsonProjectName) => {
      const project = nxJson.projects[nxJsonProjectName];
      detectAndSetInvalidProjectValues(
        map,
        nxJsonProjectName,
        project.implicitDependencies,
        projects
      );
      return map;
    }, invalidImplicitDependencies);

  if (invalidImplicitDependencies.size === 0) {
    return;
  }

  let message = `The following implicitDependencies specified in nx.json are invalid:
  `;
  invalidImplicitDependencies.forEach((projectNames, key) => {
    const str = `  ${key}
    ${projectNames.map(projectName => `    ${projectName}`).join('\n')}`;
    message += str;
  });

  throw new Error(message);
}

export function getProjectNodes(
  angularJson: any,
  nxJson: NxJson
): ProjectNode[] {
  assertWorkspaceValidity(angularJson, nxJson);

  const angularJsonProjects = Object.keys(angularJson.projects);

  return angularJsonProjects.map(key => {
    const p = angularJson.projects[key];
    const tags = nxJson.projects[key].tags;

    const projectType =
      p.projectType === 'application'
        ? key.endsWith('-e2e')
          ? ProjectType.e2e
          : ProjectType.app
        : ProjectType.lib;

    let implicitDependencies = nxJson.projects[key].implicitDependencies || [];
    if (projectType === ProjectType.e2e && implicitDependencies.length === 0) {
      implicitDependencies = [key.replace(/-e2e$/, '')];
    }

    const filesWithMTimes = allFilesInDir(`${appRoot.path}/${p.root}`);
    const fileMTimes = {};
    filesWithMTimes.forEach(f => {
      fileMTimes[f.file] = f.mtime;
    });

    return {
      name: key,
      root: p.root,
      type: projectType,
      tags,
      architect: p.architect || {},
      files: filesWithMTimes.map(f => f.file),
      implicitDependencies,
      fileMTimes
    };
  });
}

function minus(a: string[], b: string[]): string[] {
  const res = [];
  a.forEach(aa => {
    if (!b.find(bb => bb === aa)) {
      res.push(aa);
    }
  });
  return res;
}

export function readAngularJson(): any {
  return readJsonFile(`${appRoot.path}/angular.json`);
}

export function readNxJson(): NxJson {
  const config = readJsonFile<NxJson>(`${appRoot.path}/nx.json`);
  if (!config.npmScope) {
    throw new Error(`nx.json must define the npmScope property.`);
  }
  return config;
}

export const getAffected = (affectedNamesFetcher: AffectedFetcher) => (
  touchedFiles: string[]
): string[] => {
  const angularJson = readAngularJson();
  const nxJson = readNxJson();
  const projects = getProjectNodes(angularJson, nxJson);
  const implicitDeps = getImplicitDependencies(projects, angularJson, nxJson);
  const dependencies = readDependencies(nxJson.npmScope, projects);
  const sortedProjects = topologicallySortProjects(projects, dependencies);
  const tp = touchedProjects(implicitDeps, projects, touchedFiles);
  return affectedNamesFetcher(sortedProjects, dependencies, tp);
};

export function getAffectedProjectsWithTarget(target: string) {
  return getAffected(affectedProjectNamesWithTarget(target));
}
export const getAffectedApps = getAffected(affectedAppNames);
export const getAffectedProjects = getAffected(affectedProjectNames);
export const getAffectedLibs = getAffected(affectedLibNames);

export function getAllAppNames() {
  return getProjectNames(p => p.type === ProjectType.app);
}

export function getAllLibNames() {
  return getProjectNames(p => p.type === ProjectType.lib);
}

export function getAllProjectNamesWithTarget(target: string) {
  return getProjectNames(p => p.architect[target]);
}

export function getAllProjectsWithTarget(target: string) {
  const angularJson = readAngularJson();
  const nxJson = readNxJson();
  const projects = getProjectNodes(angularJson, nxJson);
  const dependencies = readDependencies(nxJson.npmScope, projects);
  const sortedProjects = topologicallySortProjects(projects, dependencies);

  return sortedProjects.filter(p => p.architect[target]).map(p => p.name);
}

export function getProjectNames(
  predicate?: (projectNode: ProjectNode) => boolean
): string[] {
  let projects = getProjectNodes(readAngularJson(), readNxJson());
  if (predicate) {
    projects = projects.filter(predicate);
  }

  return projects.map(p => p.name);
}

export function getProjectRoots(projectNames: string[]): string[] {
  const { projects } = readAngularJson();
  return projectNames.map(name => projects[name].root);
}

export function allFilesInDir(
  dirName: string
): { file: string; mtime: number }[] {
  // Ignore .gitignored files
  if (ig.ignores(path.relative(appRoot.path, dirName))) {
    return [];
  }

  let res = [];
  try {
    fs.readdirSync(dirName).forEach(c => {
      const child = path.join(dirName, c);
      if (ig.ignores(path.relative(appRoot.path, child))) {
        return;
      }
      try {
        const s = fs.statSync(child);
        if (!s.isDirectory()) {
          // add starting with "apps/myapp/..." or "libs/mylib/..."
          res.push({
            file: normalizePath(path.relative(appRoot.path, child)),
            mtime: s.mtimeMs
          });
        } else if (s.isDirectory()) {
          res = [...res, ...allFilesInDir(child)];
        }
      } catch (e) {}
    });
  } catch (e) {}
  return res;
}

export function lastModifiedAmongProjectFiles(projects: ProjectNode[]) {
  return Math.max(
    ...[
      ...projects.map(project => getProjectMTime(project)),
      mtime(`${appRoot.path}/angular.json`),
      mtime(`${appRoot.path}/nx.json`),
      mtime(`${appRoot.path}/tslint.json`),
      mtime(`${appRoot.path}/package.json`)
    ]
  );
}

export function getProjectMTime(project: ProjectNode): number {
  return Math.max(...Object.values(project.fileMTimes));
}

/**
 * Returns the time when file was last modified
 * Returns -Infinity for a non-existent file
 */
export function mtime(filePath: string): number {
  if (!fs.existsSync(filePath)) {
    return -Infinity;
  }
  return fs.statSync(filePath).mtimeMs;
}

function normalizePath(file: string): string {
  return file.split(path.sep).join('/');
}

export function normalizedProjectRoot(p: ProjectNode): string {
  return p.root
    .split('/')
    .filter(v => !!v)
    .slice(1)
    .join('/');
}

function topologicallySortProjects(
  projects: ProjectNode[],
  deps: Deps
): ProjectNode[] {
  const temporary = {};
  const marked = {};
  const res: ProjectNode[] = [];

  while (Object.keys(marked).length !== projects.length) {
    visit(projects.find(p => !marked[p.name]));
  }

  function visit(n: ProjectNode) {
    if (marked[n.name]) return;
    if (temporary[n.name]) return;
    temporary[n.name] = true;
    deps[n.name].forEach(e => {
      visit(projects.find(pp => pp.name === e.projectName));
    });
    marked[n.name] = true;
    res.push(n);
  }

  return res;
}
