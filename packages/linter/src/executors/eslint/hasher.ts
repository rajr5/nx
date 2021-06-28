import { Task, TaskGraph } from '@nrwl/devkit';
import { Hash, Hasher } from '@nrwl/workspace/src/core/hasher/hasher';
import { readJsonFile } from '@nrwl/workspace/src/utilities/fileutils';
import { appRootPath } from '@nrwl/workspace/src/utilities/app-root';
import { join } from 'path';

export default async function run(
  task: Task,
  taskGraph: TaskGraph,
  hasher: Hasher
): Promise<Hash> {
  if (task.overrides['hasTypeAwareRules'] === true) {
    return hasher.hashTaskWithDepsAndContext(task);
  }
  const command = hasher.hashCommand(task);
  const sources = await hasher.hashSource(task);
  const deps = allDeps(task.id, taskGraph);
  const nxJson = readJsonFile(join(appRootPath, 'nx.json'));
  const tags = hasher.hashArray(
    deps.map((d) => (nxJson.projects[d].tags || []).join('|'))
  );
  const context = await hasher.hashContext();
  return {
    value: hasher.hashArray([
      command,
      sources,
      tags,
      context.implicitDeps.value,
      context.runtime.value,
    ]),
    details: {
      command,
      nodes: { [task.target.project]: sources, tags },
      implicitDeps: context.implicitDeps.files,
      runtime: context.runtime.runtime,
    },
  };
}

function allDeps(taskId: string, taskGraph: TaskGraph) {
  return [...taskGraph.dependencies[taskId].map((d) => allDeps(d, taskGraph))];
}
