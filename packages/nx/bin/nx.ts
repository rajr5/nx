#!/usr/bin/env node
import { findWorkspaceRoot } from '../src/cli/find-workspace-root';
import * as chalk from 'chalk';
import { initLocal } from '../src/cli/init-local';
import { output } from '../src/cli/output';
import { detectPackageManager } from '../src/shared/package-manager';
import { Workspace } from '../src/cli/workspace';

if (process.argv[2] === 'new' || process.argv[2] === '_migrate') {
  require('../src/cli/index');
} else {
  const workspace = findWorkspaceRoot(process.cwd());
  if (workspace && workspace.type === 'nx') {
    require('v8-compile-cache');
  }
  // polyfill rxjs observable to avoid issues with multiple version fo Observable installed in node_modules
  // https://twitter.com/BenLesh/status/1192478226385428483?s=20
  if (!(Symbol as any).observable)
    (Symbol as any).observable = Symbol('observable polyfill');

  if (!workspace) {
    output.log({
      title: `The current directory isn't part of an Nx workspace.`,
      bodyLines: [
        `To create a workspace run:`,
        chalk.bold.white(`npx create-nx-workspace@latest <workspace name>`),
      ],
    });

    output.note({
      title: `For more information please visit https://nx.dev/`,
    });
    process.exit(1);
  }

  // Make sure that a local copy of Nx exists in workspace
  let localNx: string;
  try {
    localNx = resolveNx(workspace);
  } catch {
    output.error({
      title: `Could not find Nx modules in this workspace.`,
      bodyLines: [`Have you run ${chalk.bold.white(`npm/yarn install`)}?`],
    });
    process.exit(1);
  }

  if (localNx === resolveNx(null)) {
    initLocal(workspace);
  } else {
    const packageManager = detectPackageManager();
    if (packageManager === 'pnpm') {
      const tip =
        process.platform === 'win32'
          ? 'doskey pnx=pnpm nx -- $*'
          : `alias pnx="pnpm nx --"`;
      output.warn({
        title: `Running global Nx CLI with PNPM may have issues.`,
        bodyLines: [
          `Prefer to use "pnpm" (https://pnpm.io/cli/exec) to execute commands in this workspace.`,
          `${chalk.reset.inverse.bold.cyan(
            ' TIP '
          )} create a shortcut such as: ${chalk.bold.white(tip)}`,
          ``,
        ],
      });
    }

    // Nx is being run from globally installed CLI - hand off to the local
    require(localNx);
  }
}

function resolveNx(workspace: Workspace | null) {
  try {
    return require.resolve('nx/bin/nx.js', {
      paths: workspace ? [workspace.dir] : undefined,
    });
  } catch {
    return require.resolve('@nrwl/cli/bin/nx.js', {
      paths: workspace ? [workspace.dir] : undefined,
    });
  }
}
