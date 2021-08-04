import * as path from 'path';
import { FileData } from '../core/file-utils';
import type {
  ProjectGraph,
  ProjectGraphDependency,
  ProjectGraphNode,
  TargetConfiguration,
} from '@nrwl/devkit';
import { TargetProjectLocator } from '../core/target-project-locator';
import { normalizePath, DependencyType } from '@nrwl/devkit';

export interface MappedProjectGraphNode<T = any> {
  type: string;
  name: string;
  data: T & {
    root?: string;
    targets?: { [targetName: string]: TargetConfiguration };
    files: Record<string, FileData>;
  };
}
export interface MappedProjectGraph<T = any> {
  nodes: Record<string, MappedProjectGraphNode<T>>;
  dependencies: Record<string, ProjectGraphDependency[]>;
  allWorkspaceFiles?: FileData[];
}

export type Deps = { [projectName: string]: ProjectGraphDependency[] };
export type DepConstraint = {
  sourceTag: string;
  onlyDependOnLibsWithTags: string[];
};

export function hasNoneOfTheseTags(
  proj: ProjectGraphNode<any>,
  tags: string[]
) {
  return tags.filter((allowedTag) => hasTag(proj, allowedTag)).length === 0;
}

function hasTag(proj: ProjectGraphNode, tag: string) {
  return (proj.data.tags || []).indexOf(tag) > -1 || tag === '*';
}

function removeExt(file: string): string {
  return file.replace(/(?<!(^|\/))\.[^/.]+$/, '');
}

export function matchImportWithWildcard(
  // This may or may not contain wildcards ("*")
  allowableImport: string,
  extractedImport: string
): boolean {
  if (allowableImport.endsWith('/**')) {
    const prefix = allowableImport.substring(0, allowableImport.length - 2);
    return extractedImport.startsWith(prefix);
  } else if (allowableImport.endsWith('/*')) {
    const prefix = allowableImport.substring(0, allowableImport.length - 1);
    if (!extractedImport.startsWith(prefix)) return false;
    return extractedImport.substring(prefix.length).indexOf('/') === -1;
  } else if (allowableImport.indexOf('/**/') > -1) {
    const [prefix, suffix] = allowableImport.split('/**/');
    return (
      extractedImport.startsWith(prefix) && extractedImport.endsWith(suffix)
    );
  } else {
    return new RegExp(allowableImport).test(extractedImport);
  }
}

export function isRelative(s: string) {
  return s.startsWith('.');
}

export function isRelativeImportIntoAnotherProject(
  imp: string,
  projectPath: string,
  projectGraph: ProjectGraph,
  sourceFilePath: string,
  sourceProject: ProjectGraphNode
): boolean {
  if (!isRelative(imp)) return false;

  const targetFile = normalizePath(
    path.resolve(path.join(projectPath, path.dirname(sourceFilePath)), imp)
  ).substring(projectPath.length + 1);

  const targetProject = findTargetProject(projectGraph, targetFile);
  return sourceProject && targetProject && sourceProject !== targetProject;
}

export function findProjectUsingFile<T>(
  projectGraph: MappedProjectGraph<T>,
  file: string
): MappedProjectGraphNode {
  return Object.values(projectGraph.nodes).find((n) => n.data.files[file]);
}

export function findSourceProject(
  projectGraph: MappedProjectGraph,
  sourceFilePath: string
) {
  const targetFile = removeExt(sourceFilePath);
  return findProjectUsingFile(projectGraph, targetFile);
}

export function findTargetProject(
  projectGraph: ProjectGraph,
  targetFile: string
) {
  let targetProject = findProjectUsingFile(projectGraph, targetFile);
  if (!targetProject) {
    targetProject = findProjectUsingFile(
      projectGraph,
      normalizePath(path.join(targetFile, 'index'))
    );
  }
  if (!targetProject) {
    targetProject = findProjectUsingFile(
      projectGraph,
      normalizePath(path.join(targetFile, 'src', 'index'))
    );
  }
  return targetProject;
}

export function isAbsoluteImportIntoAnotherProject(imp: string) {
  // TODO: vsavkin: check if this needs to be fixed once we generalize lint rules
  return (
    imp.startsWith('libs/') ||
    imp.startsWith('/libs/') ||
    imp.startsWith('apps/') ||
    imp.startsWith('/apps/')
  );
}

export function findProjectUsingImport(
  projectGraph: ProjectGraph,
  targetProjectLocator: TargetProjectLocator,
  filePath: string,
  imp: string,
  npmScope: string
) {
  const target = targetProjectLocator.findProjectWithImport(
    imp,
    filePath,
    npmScope
  );
  return projectGraph.nodes[target];
}

export function findConstraintsFor(
  depConstraints: DepConstraint[],
  sourceProject: ProjectGraphNode
) {
  return depConstraints.filter((f) => hasTag(sourceProject, f.sourceTag));
}

export function onlyLoadChildren(
  graph: ProjectGraph,
  sourceProjectName: string,
  targetProjectName: string,
  visited: string[]
) {
  if (visited.indexOf(sourceProjectName) > -1) return false;
  return (
    (graph.dependencies[sourceProjectName] || []).filter((d) => {
      if (d.type !== DependencyType.dynamic) return false;
      if (d.target === targetProjectName) return true;
      return onlyLoadChildren(graph, d.target, targetProjectName, [
        ...visited,
        sourceProjectName,
      ]);
    }).length > 0
  );
}

export function getSourceFilePath(sourceFileName: string, projectPath: string) {
  return normalizePath(sourceFileName).substring(projectPath.length + 1);
}

/**
 * Verifies whether the given node has an architect builder attached
 * @param projectGraph the node to verify
 */
export function hasBuildExecutor(projectGraph: ProjectGraphNode): boolean {
  return (
    // can the architect not be defined? real use case?
    projectGraph.data.targets &&
    projectGraph.data.targets.build &&
    projectGraph.data.targets.build.executor !== ''
  );
}

export function mapProjectGraphFiles<T>(
  projectGraph: ProjectGraph<T>
): MappedProjectGraph | null {
  if (!projectGraph) {
    return null;
  }
  const nodes: Record<string, MappedProjectGraphNode> = {};
  Object.entries(projectGraph.nodes).forEach(([name, node]) => {
    const files: Record<string, FileData> = {};
    node.data.files.forEach(({ file, hash }) => {
      files[removeExt(file)] = { file, hash };
    });
    const data = { ...node.data, files };

    nodes[name] = { ...node, data };
  });

  return {
    ...projectGraph,
    nodes,
  };
}
