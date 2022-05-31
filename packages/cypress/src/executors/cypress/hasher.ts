import {
  Hash,
  Hasher,
  NxJsonConfiguration,
  ProjectGraph,
  Task,
  TaskGraph,
  ProjectsConfigurations,
} from '@nrwl/devkit';

export default async function run(
  task: Task,
  context: {
    hasher: Hasher;
    projectGraph: ProjectGraph;
    taskGraph: TaskGraph;
    workspaceConfig: ProjectsConfigurations & NxJsonConfiguration;
  }
): Promise<Hash> {
  const cypressPluginConfig = context.workspaceConfig.pluginsConfig
    ? (context.workspaceConfig.pluginsConfig['@nrwl/cypress'] as any)
    : undefined;
  const filter =
    cypressPluginConfig && cypressPluginConfig.hashingExcludesTestsOfDeps
      ? 'exclude-tests-of-deps'
      : 'all-files';
  return context.hasher.hashTaskWithDepsAndContext(task, filter);
}
