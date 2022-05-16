import { runCommand } from '../tasks-runner/run-command';
import { splitArgsIntoNxArgsAndOverrides } from '../utils/command-line-utils';
import { connectToNxCloudUsingScan } from './connect-to-nx-cloud';
import { performance } from 'perf_hooks';
import { createProjectGraphAsync } from '../project-graph/project-graph';
import { ProjectGraph } from '../config/project-graph';
import { NxJsonConfiguration } from '../config/nx-json';
import { workspaceRoot } from '../utils/app-root';
import { splitTarget } from '../utils/split-target';
import { output } from '../utils/output';
import { readEnvironment } from './read-environment';
import { WorkspaceJsonConfiguration } from '../config/workspace-json-project-json';

export async function runOne(
  cwd: string,
  args: { [k: string]: any }
): Promise<void> {
  performance.mark('command-execution-begins');
  performance.measure('code-loading', 'init-local', 'command-execution-begins');

  const env = readEnvironment();
  const opts = parseRunOneOptions(cwd, args, env.workspaceJson);

  const { nxArgs, overrides } = splitArgsIntoNxArgsAndOverrides(
    {
      ...opts.parsedArgs,
      configuration: opts.configuration,
      target: opts.target,
    },
    'run-one'
  );

  if (nxArgs.help) {
    await (
      await import('./run')
    ).run(cwd, workspaceRoot, opts, {}, false, true);
    process.exit(0);
  }

  const projectGraph = await createProjectGraphAsync();

  await connectToNxCloudUsingScan(nxArgs.scan);

  const { projects } = getProjects(projectGraph, opts.project);

  await runCommand(
    projects,
    projectGraph,
    env,
    nxArgs,
    overrides,
    opts.project
  );
}

function getProjects(projectGraph: ProjectGraph, project: string): any {
  if (!projectGraph.nodes[project]) {
    output.error({
      title: `Cannot find project '${project}'`,
    });
    process.exit(1);
  }
  let projects = [projectGraph.nodes[project]];
  let projectsMap = {
    [project]: projectGraph.nodes[project],
  };

  return { projects, projectsMap };
}

const targetAliases = {
  b: 'build',
  e: 'e2e',
  'i18n-extract': 'extract-i18n',
  xi18n: 'extract-i18n',
  l: 'lint',
  s: 'serve',
  t: 'test',
};

function parseRunOneOptions(
  cwd: string,
  parsedArgs: { [k: string]: any },
  workspaceConfiguration: WorkspaceJsonConfiguration & NxJsonConfiguration
): { project; target; configuration; parsedArgs } {
  const defaultProjectName = calculateDefaultProjectName(
    cwd,
    workspaceRoot,
    workspaceConfiguration
  );

  let project;
  let target;
  let configuration;

  if (parsedArgs['project:target:configuration'].indexOf(':') > -1) {
    // run case
    [project, target, configuration] = splitTarget(
      parsedArgs['project:target:configuration']
    );
    // this is to account for "nx npmsript:dev"
    if (project && !target && defaultProjectName) {
      project = defaultProjectName;
      target = project;
    }
  } else {
    target = parsedArgs['project:target:configuration'];
  }
  if (parsedArgs.project) {
    project = parsedArgs.project;
  }
  if (!project && defaultProjectName) {
    project = defaultProjectName;
  }
  if (!project || !target) {
    throw new Error(`Both project and target to have to be specified`);
  }
  if (targetAliases[target]) {
    target = targetAliases[target];
  }
  if (parsedArgs.configuration) {
    configuration = parsedArgs.configuration;
  } else if (parsedArgs.prod) {
    configuration = 'production';
  }

  const res = { project, target, configuration, parsedArgs };
  delete parsedArgs['c'];
  delete parsedArgs['project:target:configuration'];
  delete parsedArgs['configuration'];
  delete parsedArgs['prod'];
  delete parsedArgs['project'];

  return res;
}

function calculateDefaultProjectName(
  cwd: string,
  root: string,
  workspaceConfiguration: WorkspaceJsonConfiguration & NxJsonConfiguration
) {
  let relativeCwd = cwd.replace(/\\/g, '/').split(root.replace(/\\/g, '/'))[1];
  if (relativeCwd) {
    relativeCwd = relativeCwd.startsWith('/')
      ? relativeCwd.substring(1)
      : relativeCwd;
    const matchingProject = Object.keys(workspaceConfiguration.projects).find(
      (p) => {
        const projectRoot = workspaceConfiguration.projects[p].root;
        return (
          relativeCwd == projectRoot ||
          relativeCwd.startsWith(`${projectRoot}/`)
        );
      }
    );
    if (matchingProject) return matchingProject;
  }
  return (
    (workspaceConfiguration.cli as { defaultProjectName: string })
      ?.defaultProjectName || workspaceConfiguration.defaultProject
  );
}
