import {
  ExecutorContext,
  parseTargetString,
  readTargetOptions,
} from '@nrwl/devkit';

import { ChildProcess, fork } from 'child_process';
import { join } from 'path';

import { GatsbyPluginBuilderSchema } from './schema';
import { runGatsbyBuild } from '../build/build.impl';
import { GatsbyPluginBuilderSchema as BuildBuilderSchema } from '../build/schema';

export default async function* serverExecutor(
  options: GatsbyPluginBuilderSchema,
  context: ExecutorContext
) {
  const buildTarget = parseTargetString(options.buildTarget);
  const baseUrl = `${options.https ? 'https' : 'http'}://${options.host}:${
    options.port
  }`;
  const projectRoot = context.workspace.projects[context.projectName].root;
  const buildOptions = readTargetOptions<BuildBuilderSchema>(
    buildTarget,
    context
  );

  try {
    if (context.configurationName === 'production') {
      await runGatsbyBuild(
        context.root,
        projectRoot,
        context.projectName,
        buildOptions
      );

      await runGatsbyServe(context.root, projectRoot, options);

      yield { baseUrl, success: true };
    } else {
      const success = await runGatsbyDevelop(
        context.root,
        projectRoot,
        createGatsbyOptions(options)
      );

      yield {
        baseUrl,
        success,
      };
    }

    // This Promise intentionally never resolves, leaving the process running
    await new Promise<{ success: boolean }>(() => {});
  } finally {
    if (childProcess) {
      childProcess.kill();
    }
  }
}

function createGatsbyOptions(options) {
  return Object.keys(options).reduce((acc, k) => {
    if (k === 'port' || k === 'host' || k === 'https' || k === 'open')
      acc.push(`--${k}=${options[k]}`);
    return acc;
  }, []);
}

let childProcess: ChildProcess;

async function runGatsbyDevelop(workspaceRoot, projectRoot, options) {
  return new Promise<boolean>((resolve, reject) => {
    childProcess = fork(
      require.resolve('gatsby-cli'),
      ['develop', ...options],
      {
        cwd: join(workspaceRoot, projectRoot),
        env: {
          ...process.env,
        },
        stdio: ['inherit', 'inherit', 'inherit', 'ipc'],
      }
    );

    childProcess.on('message', ({ action }) => {
      if (
        action?.type === 'ACTIVITY_END' &&
        action?.payload?.status === 'SUCCESS' &&
        action?.payload?.id === 'webpack-develop'
      ) {
        resolve(true);
      }
    });

    childProcess.on('error', (err) => {
      reject(err);
    });

    childProcess.on('exit', (code) => {
      if (code !== 0) {
        reject(
          new Error(
            'Could not start Gatsby Development Server. See errors above.'
          )
        );
      }
    });
  });
}

function runGatsbyServe(
  workspaceRoot: string,
  projectRoot: string,
  options: GatsbyPluginBuilderSchema
) {
  return new Promise((resolve, reject) => {
    childProcess = fork(
      require.resolve('gatsby-cli'),
      ['serve', ...createGatsbyServeOptions(options)],
      { cwd: join(workspaceRoot, projectRoot) }
    );

    childProcess.on('error', (err) => {
      reject(err);
    });

    childProcess.on('exit', (code) => {
      if (code === 0) {
        resolve(code);
      } else {
        reject(
          new Error(
            'Could not start Gatsby Production Server. See errors above.'
          )
        );
      }
    });
  });
}

function createGatsbyServeOptions(options: GatsbyPluginBuilderSchema) {
  return Object.keys(options).reduce((acc, k) => {
    const val = options[k];
    if (typeof val === 'undefined') return acc;
    switch (k) {
      case 'host':
        return val ? acc.concat([`--host`, val]) : acc;
      case 'open':
        return val ? acc.concat(`--open`) : acc;
      case 'prefixPaths':
        return val ? acc.concat(`--prefix-paths`) : acc;
      case 'port':
        return val ? acc.concat([`--port`, val]) : acc;
      default:
        return acc;
    }
  }, []);
}
