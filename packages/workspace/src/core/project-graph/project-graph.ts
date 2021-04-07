import { assertWorkspaceValidity } from '../assert-workspace-validity';
import { createProjectFileMap, ProjectFileMap } from '../file-graph';
import {
  FileData,
  filesChanged,
  readNxJson,
  readWorkspaceFiles,
  readWorkspaceJson,
  rootWorkspaceFileData,
} from '../file-utils';
import { normalizeNxJson } from '../normalize-nx-json';
import {
  BuildDependencies,
  buildExplicitPackageJsonDependencies,
  buildExplicitTypeScriptDependencies,
  buildImplicitProjectDependencies,
} from './build-dependencies';
import {
  BuildNodes,
  buildNpmPackageNodes,
  buildWorkspaceProjectNodes,
} from './build-nodes';
import { ProjectGraphBuilder } from './project-graph-builder';
import { ProjectGraph } from './project-graph-models';
import {
  differentFromCache,
  ProjectGraphCache,
  readCache,
  writeCache,
} from '../nx-deps/nx-deps-cache';
import { NxJson } from '../shared-interfaces';
import { performance } from 'perf_hooks';

export function createProjectGraph(
  workspaceJson = readWorkspaceJson(),
  nxJson = readNxJson(),
  workspaceFiles = readWorkspaceFiles(),
  cache: false | ProjectGraphCache = readCache(),
  shouldCache: boolean = true
): ProjectGraph {
  assertWorkspaceValidity(workspaceJson, nxJson);
  const normalizedNxJson = normalizeNxJson(nxJson);

  const rootFiles = rootWorkspaceFileData();
  const projectFileMap = createProjectFileMap(workspaceJson, workspaceFiles);

  if (cache && !filesChanged(rootFiles, cache.rootFiles)) {
    const diff = differentFromCache(projectFileMap, cache);
    if (diff.noDifference) {
      return addWorkspaceFiles(
        diff.partiallyConstructedProjectGraph,
        workspaceFiles
      );
    }

    const ctx = {
      workspaceJson,
      nxJson: normalizedNxJson,
      fileMap: diff.filesDifferentFromCache,
    };
    const projectGraph = buildProjectGraph(
      ctx,
      diff.partiallyConstructedProjectGraph
    );
    if (shouldCache) {
      writeCache(rootFiles, projectGraph);
    }
    return addWorkspaceFiles(projectGraph, workspaceFiles);
  } else {
    const ctx = {
      workspaceJson,
      nxJson: normalizedNxJson,
      fileMap: projectFileMap,
    };
    const projectGraph = buildProjectGraph(ctx, null);
    if (shouldCache) {
      writeCache(rootFiles, projectGraph);
    }
    return addWorkspaceFiles(projectGraph, workspaceFiles);
  }
}

export function readCurrentProjectGraph(): ProjectGraph | null {
  const cache = readCache();
  return cache === false ? null : cache;
}

function addWorkspaceFiles(
  projectGraph: ProjectGraph,
  allWorkspaceFiles: FileData[]
) {
  return { ...projectGraph, allWorkspaceFiles };
}

function buildProjectGraph(
  ctx: {
    nxJson: NxJson<string[]>;
    workspaceJson: any;
    fileMap: ProjectFileMap;
  },
  projectGraph: ProjectGraph
) {
  performance.mark('build project graph:start');
  const builder = new ProjectGraphBuilder(projectGraph);
  const buildNodesFns: BuildNodes[] = [
    buildWorkspaceProjectNodes,
    buildNpmPackageNodes,
  ];
  const buildDependenciesFns: BuildDependencies[] = [
    buildExplicitTypeScriptDependencies,
    buildImplicitProjectDependencies,
    buildExplicitPackageJsonDependencies,
  ];
  buildNodesFns.forEach((f) => f(ctx, builder.addNode.bind(builder)));
  buildDependenciesFns.forEach((f) =>
    f(ctx, builder.nodes, builder.addDependency.bind(builder))
  );
  const r = builder.build();
  performance.mark('build project graph:end');
  performance.measure(
    'build project graph',
    'build project graph:start',
    'build project graph:end'
  );
  return r;
}
