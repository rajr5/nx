import { ExecutorContext, joinPathFragments, logger } from '@nrwl/devkit';
import 'dotenv/config';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { gte } from 'semver';
import { findOrCreateConfig } from '../utils/utilities';
import { CommonNxStorybookConfig } from './models';

export interface NodePackage {
  name: string;
  version: string;
}

export function getStorybookFrameworkPath(uiFramework) {
  const serverOptionsPaths = {
    '@storybook/react': '@storybook/react/dist/cjs/server/options',
    '@storybook/html': '@storybook/html/dist/cjs/server/options',
    '@storybook/vue': '@storybook/vue/dist/cjs/server/options',
    '@storybook/vue3': '@storybook/vue3/dist/cjs/server/options',
    '@storybook/web-components':
      '@storybook/web-components/dist/cjs/server/options',
    '@storybook/svelte': '@storybook/svelte/dist/cjs/server/options',
  };

  if (isStorybookV62onwards(uiFramework)) {
    return serverOptionsPaths[uiFramework];
  } else {
    return `${uiFramework}/dist/server/options`;
  }
}

function isStorybookV62onwards(uiFramework) {
  const storybookPackageVersion = require(join(
    uiFramework,
    'package.json'
  )).version;

  return gte(storybookPackageVersion, '6.2.0-rc.4');
}

export function runStorybookSetupCheck(options: CommonNxStorybookConfig) {
  webpackFinalPropertyCheck(options);
  reactWebpack5Check(options);
}

function reactWebpack5Check(options: CommonNxStorybookConfig) {
  if (options.uiFramework === '@storybook/react') {
    let storybookConfigFilePath = joinPathFragments(
      options.config.configFolder,
      'main.js'
    );

    if (!existsSync(storybookConfigFilePath)) {
      storybookConfigFilePath = joinPathFragments(
        options.config.configFolder,
        'main.ts'
      );
    }

    if (!existsSync(storybookConfigFilePath)) {
      // looks like there's no main config file, so skip
      return;
    }

    // check whether the current Storybook configuration has the webpack 5 builder enabled
    const storybookConfig = readFileSync(storybookConfigFilePath, {
      encoding: 'utf8',
    });

    if (
      !storybookConfig.match(/builder: ('webpack5'|"webpack5"|`webpack5`)/g)
    ) {
      // storybook needs to be upgraded to webpack 5
      logger.warn(`
It looks like you use Webpack 5 but your Storybook setup is not configured to leverage that
and thus falls back to Webpack 4.
Make sure you upgrade your Storybook config to use Webpack 5.

  - https://gist.github.com/shilman/8856ea1786dcd247139b47b270912324#upgrade
      
`);
    }
  }
}

function webpackFinalPropertyCheck(options: CommonNxStorybookConfig) {
  let placesToCheck = [
    {
      path: joinPathFragments('.storybook', 'webpack.config.js'),
      result: false,
    },
    {
      path: joinPathFragments(options.config.configFolder, 'webpack.config.js'),
      result: false,
    },
  ];

  placesToCheck = placesToCheck
    .map((entry) => {
      return {
        ...entry,
        result: existsSync(entry.path),
      };
    })
    .filter((x) => x.result === true);

  if (placesToCheck.length > 0) {
    logger.warn(
      `
  You have a webpack.config.js files in your Storybook configuration:
  ${placesToCheck.map((x) => `- "${x.path}"`).join('\n  ')}

  Consider switching to the "webpackFinal" property declared in "main.js" instead.
  ${
    options.uiFramework === '@storybook/react'
      ? 'https://nx.dev/storybook/migrate-webpack-final-react'
      : 'https://nx.dev/storybook/migrate-webpack-final-angular'
  }
    `
    );
  }
}

export function resolveCommonStorybookOptionMapper(
  builderOptions: CommonNxStorybookConfig,
  frameworkOptions: any,
  context: ExecutorContext
) {
  const storybookConfig = findOrCreateConfig(builderOptions.config, context);
  const storybookOptions = {
    workspaceRoot: context.root,
    configDir: storybookConfig,
    ...frameworkOptions,
    frameworkPresets: [...(frameworkOptions.frameworkPresets || [])],
    watch: false,
  };

  return storybookOptions;
}
