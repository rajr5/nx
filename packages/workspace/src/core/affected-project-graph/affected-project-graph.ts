import { reverse } from '../project-graph';
import {
  FileChange,
  readNxJson,
  readPackageJson,
  readWorkspaceJson,
} from '../file-utils';
import type { NxJsonConfiguration, ProjectGraph } from '@nrwl/devkit';
import {
  getImplicitlyTouchedProjects,
  getTouchedProjects,
} from './locators/workspace-projects';
import { getTouchedNpmPackages } from './locators/npm-packages';
import { getImplicitlyTouchedProjectsByJsonChanges } from './locators/implicit-json-changes';
import {
  AffectedProjectGraphContext,
  TouchedProjectLocator,
} from './affected-project-graph-models';
import { normalizeNxJson } from '../normalize-nx-json';
import { getTouchedProjectsInNxJson } from './locators/nx-json-changes';
import { getTouchedProjectsInWorkspaceJson } from './locators/workspace-json-changes';
import { getTouchedProjectsFromTsConfig } from './locators/tsconfig-json-changes';

export function filterAffected(
  graph: ProjectGraph,
  touchedFiles: FileChange[],
  workspaceJson: any = readWorkspaceJson(),
  nxJson: NxJsonConfiguration = readNxJson(),
  packageJson: any = readPackageJson()
): ProjectGraph {
  const normalizedNxJson = normalizeNxJson(nxJson);
  // Additional affected logic should be in this array.
  const touchedProjectLocators: TouchedProjectLocator[] = [
    getTouchedProjects,
    getImplicitlyTouchedProjects,
    getTouchedNpmPackages,
    getImplicitlyTouchedProjectsByJsonChanges,
    getTouchedProjectsInNxJson,
    getTouchedProjectsInWorkspaceJson,
    getTouchedProjectsFromTsConfig,
  ];
  const touchedProjects = touchedProjectLocators.reduce((acc, f) => {
    return acc.concat(
      f(touchedFiles, workspaceJson, normalizedNxJson, packageJson, graph)
    );
  }, [] as string[]);

  return filterAffectedProjects(graph, {
    workspaceJson,
    nxJson: normalizedNxJson,
    touchedProjects,
  });
}

// -----------------------------------------------------------------------------

function filterAffectedProjects(
  graph: ProjectGraph,
  ctx: AffectedProjectGraphContext
): ProjectGraph {
  const result = { nodes: {}, dependencies: {} } as ProjectGraph;
  const reversed = reverse(graph);
  ctx.touchedProjects.forEach((p) => {
    addAffectedNodes(p, reversed, result, []);
  });
  ctx.touchedProjects.forEach((p) => {
    addAffectedDependencies(p, reversed, result, []);
  });
  return result;
}

function addAffectedNodes(
  startingProject: string,
  reversed: ProjectGraph,
  result: ProjectGraph,
  visited: string[]
): void {
  if (visited.indexOf(startingProject) > -1) return;
  if (!reversed.nodes[startingProject]) {
    throw new Error(`Invalid project name is detected: "${startingProject}"`);
  }
  visited.push(startingProject);
  result.nodes[startingProject] = reversed.nodes[startingProject];
  result.dependencies[startingProject] = [];
  reversed.dependencies[startingProject].forEach(({ target }) =>
    addAffectedNodes(target, reversed, result, visited)
  );
}

function addAffectedDependencies(
  startingProject: string,
  reversed: ProjectGraph,
  result: ProjectGraph,
  visited: string[]
): void {
  if (visited.indexOf(startingProject) > -1) return;
  visited.push(startingProject);

  reversed.dependencies[startingProject].forEach(({ target }) =>
    addAffectedDependencies(target, reversed, result, visited)
  );
  reversed.dependencies[startingProject].forEach(({ type, source, target }) => {
    // Since source and target was reversed,
    // we need to reverse it back to original direction.
    if (!result.dependencies[target]) {
      result.dependencies[target] = [];
    }
    result.dependencies[target].push({ type, source: target, target: source });
  });
}
