import {
  getPackageManagerCommand,
  stripIndents,
  writeJsonFile,
} from '@nrwl/devkit';
import * as chalk from 'chalk';
import { execSync } from 'child_process';
import * as path from 'path';
import * as yargs from 'yargs';
import { generateDaemonHelpOutput } from '../core/project-graph/daemon/client/generate-help-output';
import { nxVersion } from '../utils/versions';
import { examples } from './examples';

const noop = (yargs: yargs.Argv): yargs.Argv => yargs;

const isGenerateDocsProcess = process.env.NX_GENERATE_DOCS_PROCESS === 'true';
const daemonHelpOutput = generateDaemonHelpOutput(isGenerateDocsProcess);

// Ensure that the output takes up the available width of the terminal
yargs.wrap(yargs.terminalWidth());

/**
 * Exposing the Yargs commands object so the documentation generator can
 * parse it. The CLI will consume it and call the `.argv` to bootstrapped
 * the CLI. These command declarations needs to be in a different file
 * from the `.argv` call, so the object and it's relative scripts can
 * be executed correctly.
 */
export const commandsObject = yargs
  .parserConfiguration({
    'strip-dashed': true,
  })
  .usage(
    `
${chalk.bold('Smart, Extensible Build Framework')}` +
      (daemonHelpOutput
        ? `

${daemonHelpOutput}
  `.trimRight()
        : '')
  )
  .command(
    'run [project][:target][:configuration] [options, ...]',
    `
    Run a target for a project
    (e.g., nx run myapp:serve:production).

    You can also use the infix notation to run a target:
    (e.g., nx serve myapp --configuration=production)

    You can skip the use of Nx cache by using the --skip-nx-cache option.
    `
  )
  .command(
    'generate [collection:][generator] [options, ...]',
    `
    ${chalk.bold('Generate or update source code')}
    (e.g., nx generate @nrwl/web:app myapp).
    `
  )

  .command(
    'affected',
    chalk.bold('Run target for affected projects'),
    (yargs) =>
      linkToNxDevAndExamples(
        withAffectedOptions(withParallel(withTarget(yargs))),
        'affected'
      ),
    async (args) =>
      (await import('./affected')).affected('affected', { ...args })
  )
  .command(
    'run-many',
    chalk.bold('Run target for multiple listed projects'),
    (yargs) =>
      linkToNxDevAndExamples(
        withRunManyOptions(withParallel(withTarget(yargs))),
        'run-many'
      ),
    async (args) => (await import('./run-many')).runMany({ ...args })
  )
  .command(
    'affected:apps',
    chalk.bold('Print applications affected by changes'),
    (yargs) =>
      linkToNxDevAndExamples(
        withAffectedOptions(withPlainOption(yargs)),
        'affected:apps'
      ),
    async (args) => (await import('./affected')).affected('apps', { ...args })
  )
  .command(
    'affected:libs',
    chalk.bold('Print libraries affected by changes'),
    (yargs) =>
      linkToNxDevAndExamples(
        withAffectedOptions(withPlainOption(yargs)),
        'affected:libs'
      ),
    async (args) =>
      (await import('./affected')).affected('libs', {
        ...args,
      })
  )
  .command(
    'affected:build',
    chalk.bold(
      'Build applications and publishable libraries affected by changes'
    ),
    (yargs) =>
      linkToNxDevAndExamples(
        withAffectedOptions(withParallel(yargs)),
        'affected:build'
      ),
    async (args) =>
      (await import('./affected')).affected('affected', {
        ...args,
        target: 'build',
      })
  )
  .command(
    'affected:test',
    chalk.bold('Test projects affected by changes'),
    (yargs) =>
      linkToNxDevAndExamples(
        withAffectedOptions(withParallel(yargs)),
        'affected:test'
      ),
    async (args) =>
      (await import('./affected')).affected('affected', {
        ...args,
        target: 'test',
      })
  )
  .command(
    'affected:e2e',
    chalk.bold('Run e2e tests for the applications affected by changes'),
    (yargs) =>
      linkToNxDevAndExamples(
        withAffectedOptions(withParallel(yargs)),
        'affected:e2e'
      ),
    async (args) =>
      (await import('./affected')).affected('affected', {
        ...args,
        target: 'e2e',
      })
  )
  .command(
    'affected:dep-graph',
    chalk.bold('Graph dependencies affected by changes'),
    (yargs) =>
      linkToNxDevAndExamples(
        withAffectedOptions(withDepGraphOptions(yargs)),
        'affected:dep-graph'
      ),
    async (args) =>
      (await import('./affected')).affected('dep-graph', {
        ...args,
      })
  )
  .command(
    'print-affected',
    chalk.bold(
      'Prints information about the projects and targets affected by changes'
    ),
    (yargs) =>
      linkToNxDevAndExamples(
        withAffectedOptions(withPrintAffectedOptions(yargs)),
        'print-affected'
      ),
    async (args) =>
      (await import('./affected')).affected('print-affected', {
        ...args,
      })
  )
  .command(
    'affected:lint',
    chalk.bold('Lint projects affected by changes'),
    async (yargs) =>
      linkToNxDevAndExamples(
        withAffectedOptions(withParallel(yargs)),
        'affected:lint'
      ),
    async (args) =>
      (await import('./affected')).affected('affected', {
        ...args,
        target: 'lint',
      })
  )
  .command(
    'daemon',
    `${chalk.bold('EXPERIMENTAL: Nx Daemon')}` +
      (daemonHelpOutput
        ? stripIndents`${daemonHelpOutput}`.trimRight()
        : `

The Daemon is not currently running you can start it manually by running the following command:

npx nx daemon
`.trimRight()),
    (yargs) => linkToNxDevAndExamples(withDaemonStartOptions(yargs), 'daemon'),
    async (args) => (await import('./daemon')).daemonHandler(args)
  )

  .command(
    'dep-graph',
    chalk.bold('Graph dependencies within workspace'),
    (yargs) => linkToNxDevAndExamples(withDepGraphOptions(yargs), 'dep-graph'),
    async (args) => (await import('./dep-graph')).generateGraph(args as any, [])
  )

  .command(
    'format:check',
    chalk.bold('Check for un-formatted files'),
    (yargs) => linkToNxDevAndExamples(withFormatOptions(yargs), 'format:check'),
    async (args) => (await import('./format')).format('check', args)
  )
  .command(
    ['format:write', 'format'],
    chalk.bold('Overwrite un-formatted files'),
    (yargs) => linkToNxDevAndExamples(withFormatOptions(yargs), 'format:write'),
    async (args) => (await import('./format')).format('write', args)
  )
  .command(
    'workspace-lint [files..]',
    chalk.bold(
      'Lint workspace or list of files.  Note: To exclude files from this lint rule, you can add them to the ".nxignore" file'
    ),
    noop,
    async (_) => (await import('./lint')).workspaceLint()
  )

  .command(
    ['workspace-generator [name]', 'workspace-schematic [name]'],
    chalk.bold(
      'Runs a workspace generator from the tools/generators directory'
    ),
    (yargs) => {
      yargs.option('list-generators', {
        describe: 'List the available workspace-generators',
        type: 'boolean',
      });
      /**
       * Don't require `name` if only listing available
       * schematics
       */
      if (yargs.argv.listGenerators !== true) {
        yargs.demandOption(['name']).positional('name', {
          type: 'string',
          describe: 'The name of your generator`',
        });
      }
      return linkToNxDevAndExamples(yargs, 'workspace-generator');
    },
    async () =>
      (await import('./workspace-generators')).workspaceGenerators(
        process.argv.slice(3)
      )
  )

  .command(
    'migrate',
    chalk.bold(`Creates a migrations file or runs migrations from the migrations file.
- Migrate packages and create migrations.json (e.g., nx migrate @nrwl/workspace@latest)
- Run migrations (e.g., nx migrate --run-migrations=migrations.json)
`),
    (yargs) => linkToNxDevAndExamples(yargs, 'migrate'),
    () => {
      if (process.env.NX_MIGRATE_USE_LOCAL === undefined) {
        const p = taoPath();
        execSync(`${p} migrate ${process.argv.slice(3).join(' ')}`, {
          stdio: ['inherit', 'inherit', 'inherit'],
        });
      } else {
        const pmc = getPackageManagerCommand();
        execSync(`${pmc.exec} tao migrate ${process.argv.slice(3).join(' ')}`, {
          stdio: ['inherit', 'inherit', 'inherit'],
        });
      }
    }
  )
  .command(require('./report').report)
  .command(require('./list').list)
  .command({
    command: 'reset',
    describe:
      'Clears all the cached Nx artifacts and metadata about the workspace and shuts down the Nx Daemon.',
    // Prior to v13 clear-cache was a top level nx command, so preserving as an alias
    aliases: ['clear-cache'],
    handler: async () => (await import('./reset')).resetHandler(),
  })
  .command(
    'connect-to-nx-cloud',
    chalk.bold(`Makes sure the workspace is connected to Nx Cloud`),
    (yargs) => linkToNxDevAndExamples(yargs, 'connect-to-nx-cloud'),
    async () =>
      (await import('./connect-to-nx-cloud')).connectToNxCloudCommand()
  )
  .help('help')
  .version(nxVersion);

function withFormatOptions(yargs: yargs.Argv): yargs.Argv {
  return withAffectedOptions(yargs)
    .option('libs-and-apps', {
      describe: 'Format only libraries and applications files.',
      type: 'boolean',
    })
    .option('projects', {
      describe: 'Projects to format (comma delimited)',
      type: 'array',
      coerce: parseCSV,
    })
    .conflicts({
      all: 'projects',
    });
}

function linkToNxDevAndExamples(yargs: yargs.Argv, command: string) {
  (examples[command] || []).forEach((t) => {
    yargs = yargs.example(t.command, t.description);
  });
  return yargs.epilog(
    chalk.bold(
      `Find more information and examples at https://nx.dev/cli/${command.replace(
        ':',
        '-'
      )}`
    )
  );
}

function withDaemonStartOptions(yargs: yargs.Argv): yargs.Argv {
  return yargs.option('background', { type: 'boolean', default: true });
}

function withPrintAffectedOptions(yargs: yargs.Argv): yargs.Argv {
  return yargs.option('select', {
    type: 'string',
    describe:
      'Select the subset of the returned json document (e.g., --selected=projects)',
  });
}

function withPlainOption(yargs: yargs.Argv): yargs.Argv {
  return yargs.option('plain', {
    describe: 'Produces a plain output for affected:apps and affected:libs',
  });
}

function withAffectedOptions(yargs: yargs.Argv): yargs.Argv {
  return yargs
    .option('files', {
      describe:
        'Change the way Nx is calculating the affected command by providing directly changed files, list of files delimited by commas',
      type: 'array',
      requiresArg: true,
      coerce: parseCSV,
    })
    .option('uncommitted', {
      describe: 'Uncommitted changes',
      type: 'boolean',
      default: undefined,
    })
    .option('untracked', {
      describe: 'Untracked changes',
      type: 'boolean',
      default: undefined,
    })
    .option('all', {
      describe: 'All projects',
      type: 'boolean',
      default: undefined,
    })
    .option('base', {
      describe: 'Base of the current branch (usually main)',
      type: 'string',
      requiresArg: true,
    })
    .option('head', {
      describe: 'Latest commit of the current branch (usually HEAD)',
      type: 'string',
      requiresArg: true,
    })
    .group(
      ['base'],
      'Run command using --base=[SHA1] (affected by the committed, uncommitted and untracked changes):'
    )
    .group(
      ['base', 'head'],
      'or using --base=[SHA1] --head=[SHA2] (affected by the committed changes):'
    )
    .group(['files', 'uncommitted', 'untracked'], 'or using:')
    .implies('head', 'base')
    .option('exclude', {
      describe: 'Exclude certain projects from being processed',
      type: 'array',
      coerce: parseCSV,
      default: [],
    })
    .options('runner', {
      describe: 'This is the name of the tasks runner configured in nx.json',
      type: 'string',
    })
    .options('skip-nx-cache', {
      describe:
        'Rerun the tasks even when the results are available in the cache',
      type: 'boolean',
      default: false,
    })
    .options('configuration', {
      describe:
        'This is the configuration to use when performing tasks on projects',
      type: 'string',
    })
    .options('only-failed', {
      describe: 'Isolate projects which previously failed',
      type: 'boolean',
      default: false,
    })
    .option('verbose', {
      describe: 'Print additional error stack trace on failure',
    })
    .conflicts({
      files: ['uncommitted', 'untracked', 'base', 'head', 'all'],
      untracked: ['uncommitted', 'files', 'base', 'head', 'all'],
      uncommitted: ['files', 'untracked', 'base', 'head', 'all'],
      all: ['files', 'untracked', 'uncommitted', 'base', 'head'],
    });
}

function withRunManyOptions(yargs: yargs.Argv): yargs.Argv {
  return yargs
    .option('projects', {
      describe: 'Projects to run (comma delimited)',
      type: 'string',
    })
    .option('all', {
      describe: 'Run the target on all projects in the workspace',
      type: 'boolean',
      default: undefined,
    })
    .check(({ all, projects }) => {
      if ((all && projects) || (!all && !projects))
        throw new Error('You must provide either --all or --projects');
      return true;
    })
    .options('runner', {
      describe: 'Override the tasks runner in `nx.json`',
      type: 'string',
    })
    .options('skip-nx-cache', {
      describe:
        'Rerun the tasks even when the results are available in the cache',
      type: 'boolean',
      default: false,
    })
    .options('configuration', {
      describe:
        'This is the configuration to use when performing tasks on projects',
      type: 'string',
    })
    .options('with-deps', {
      describe:
        'Include dependencies of specified projects when computing what to run',
      type: 'boolean',
      default: false,
      deprecated:
        'Configure target dependencies instead. It will be removed in v14.',
    })
    .options('only-failed', {
      describe: 'Only run the target on projects which previously failed',
      type: 'boolean',
      default: false,
    })
    .option('exclude', {
      describe: 'Exclude certain projects from being processed',
      type: 'array',
      coerce: parseCSV,
      default: [],
    })
    .option('verbose', {
      describe: 'Print additional error stack trace on failure',
    })
    .conflicts({
      all: 'projects',
    });
}

function withDepGraphOptions(yargs: yargs.Argv): yargs.Argv {
  return yargs
    .option('file', {
      describe:
        'Output file (e.g. --file=output.json or --file=dep-graph.html)',
      type: 'string',
    })
    .option('focus', {
      describe:
        'Use to show the dependency graph for a particular project and every node that is either an ancestor or a descendant.',
      type: 'string',
    })
    .option('exclude', {
      describe:
        'List of projects delimited by commas to exclude from the dependency graph.',
      type: 'array',
      coerce: parseCSV,
    })
    .option('groupByFolder', {
      describe: 'Group projects by folder in the dependency graph',
      type: 'boolean',
    })
    .option('host', {
      describe: 'Bind the dependency graph server to a specific ip address.',
      type: 'string',
    })
    .option('port', {
      describe: 'Bind the dependecy graph server to a specific port.',
      type: 'number',
    })
    .option('watch', {
      describe: 'Watch for changes to dependency graph and update in-browser',
      type: 'boolean',
      default: false,
    })
    .option('open', {
      describe: 'Open the dependency graph in the browser.',
      type: 'boolean',
      default: true,
    });
}

function parseCSV(args: string[]) {
  return args
    .map((arg) => arg.split(','))
    .reduce((acc, value) => {
      return [...acc, ...value];
    }, [] as string[]);
}

function withParallel(yargs: yargs.Argv): yargs.Argv {
  return yargs
    .option('parallel', {
      describe: 'Parallelize the command',
      type: 'boolean',
      default: false,
    })
    .option('maxParallel', {
      describe:
        'Max number of parallel processes. This flag is ignored if the parallel option is set to `false`.',
      type: 'number',
      default: 3,
    });
}

function withTarget(yargs: yargs.Argv): yargs.Argv {
  return yargs.option('target', {
    describe: 'Task to run for affected projects',
    type: 'string',
    requiresArg: true,
    demandOption: true,
    global: false,
  });
}

function taoPath() {
  const packageManager = getPackageManagerCommand();

  const { dirSync } = require('tmp');
  const tmpDir = dirSync().name;
  writeJsonFile(path.join(tmpDir, 'package.json'), {
    dependencies: {
      '@nrwl/tao': 'latest',

      // these deps are required for migrations written using angular devkit
      '@angular-devkit/architect': 'latest',
      '@angular-devkit/schematics': 'latest',
      '@angular-devkit/core': 'latest',
    },
    license: 'MIT',
  });

  execSync(packageManager.install, {
    cwd: tmpDir,
    stdio: ['ignore', 'ignore', 'ignore'],
  });

  // Set NODE_PATH so that these modules can be used for module resolution
  addToNodePath(path.join(tmpDir, 'node_modules'));

  return path.join(tmpDir, `node_modules`, '.bin', 'tao');
}

function addToNodePath(dir: string) {
  // NODE_PATH is a delimited list of paths.
  // The delimiter is different for windows.
  const delimiter = require('os').platform === 'win32' ? ';' : ':';

  const paths = process.env.NODE_PATH
    ? process.env.NODE_PATH.split(delimiter)
    : [];

  // Add the tmp path
  paths.push(dir);

  // Update the env variable.
  process.env.NODE_PATH = paths.join(delimiter);
}
