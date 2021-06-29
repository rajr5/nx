import { join, resolve } from 'path';
import { LicenseWebpackPlugin } from 'license-webpack-plugin';
import { TsconfigPathsPlugin } from 'tsconfig-paths-webpack-plugin';

import { AssetGlobPattern, BuildBuilderOptions } from './types';
import { getOutputHashFormat } from './hash-format';
import CircularDependencyPlugin = require('circular-dependency-plugin');
import ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');

const IGNORED_WEBPACK_WARNINGS = [
  /The comment file/i,
  /could not find any license/i,
];

// TODO(jack): Remove this in Nx 13 and go back to proper types
type Configuration = any;
type WebpackPluginInstance = any;

export function getBaseWebpackPartial(
  options: BuildBuilderOptions,
  esm?: boolean,
  isScriptOptimizeOn?: boolean,
  emitDecoratorMetadata?: boolean,
  configuration?: string
): Configuration {
  // TODO(jack): Remove this in Nx 13 and go back to proper imports
  const { webpack } = require('../webpack/entry');
  const { ProgressPlugin } = webpack;

  const extensions = ['.ts', '.tsx', '.mjs', '.js', '.jsx'];
  const mainFields = [...(esm ? ['es2015'] : []), 'module', 'main'];
  const hashFormat = getOutputHashFormat(options.outputHashing);
  const suffixFormat = esm ? '.esm' : '.es5';
  const filename = isScriptOptimizeOn
    ? `[name]${hashFormat.script}${suffixFormat}.js`
    : '[name].js';
  const chunkFilename = isScriptOptimizeOn
    ? `[name]${hashFormat.chunk}${suffixFormat}.js`
    : '[name].js';
  const mode = isScriptOptimizeOn ? 'production' : 'development';

  const webpackConfig: Configuration = {
    entry: {
      main: [options.main],
    },
    devtool: options.sourceMap ? 'source-map' : false,
    mode,
    output: {
      path: options.outputPath,
      filename,
      chunkFilename,
    },
    module: {
      rules: [
        {
          test: /\.([jt])sx?$/,
          loader: join(__dirname, 'web-babel-loader'),
          exclude: /node_modules/,
          options: {
            rootMode: 'upward',
            cwd: join(options.root, options.sourceRoot),
            emitDecoratorMetadata,
            isModern: esm,
            envName: isScriptOptimizeOn ? 'production' : configuration,
            babelrc: true,
            cacheDirectory: true,
            cacheCompression: false,
          },
        },
      ],
    },
    resolve: {
      extensions,
      alias: getAliases(options),
      plugins: [
        // TODO  Remove the never type when module is updated
        // PR opened for the proper typing here; https://github.com/dividab/tsconfig-paths-webpack-plugin/pull/66
        new TsconfigPathsPlugin({
          configFile: options.tsConfig,
          extensions,
          mainFields,
        }),
      ],
      // Search closest node_modules first, and then fallback to to default node module resolution scheme.
      // This ensures we are pulling the correct versions of dependencies, such as `core-js`.
      modules: [resolve(__dirname, '..', '..', 'node_modules'), 'node_modules'],
      mainFields,
    },
    performance: {
      hints: false,
    },
    plugins: [new webpack.DefinePlugin(getClientEnvironment(mode).stringified)],
    watch: options.watch,
    watchOptions: {
      poll: options.poll,
    },
    stats: getStatsConfig(options),
  };

  if (isScriptOptimizeOn) {
    webpackConfig.optimization = {
      minimizer: [createTerserPlugin(esm, !!options.sourceMap)],
      runtimeChunk: true,
    };
  }

  const extraPlugins: WebpackPluginInstance[] = [];

  if (esm) {
    extraPlugins.push(
      new ForkTsCheckerWebpackPlugin({
        typescript: {
          enabled: true,
          configFile: options.tsConfig,
          memoryLimit: options.memoryLimit || 2018,
        },
      })
    );
  }

  if (options.progress) {
    extraPlugins.push(new ProgressPlugin());
  }

  // TODO  LicenseWebpackPlugin needs a PR for proper typing
  if (options.extractLicenses) {
    extraPlugins.push(
      new LicenseWebpackPlugin({
        stats: {
          errors: false,
        },
        perChunkOutput: false,
        outputFilename: `3rdpartylicenses.txt`,
      }) as unknown as WebpackPluginInstance
    );
  }

  if (Array.isArray(options.assets) && options.assets.length > 0) {
    extraPlugins.push(createCopyPlugin(options.assets));
  }

  if (options.showCircularDependencies) {
    extraPlugins.push(
      new CircularDependencyPlugin({
        exclude: /[\\\/]node_modules[\\\/]/,
      })
    );
  }

  webpackConfig.plugins = [...webpackConfig.plugins, ...extraPlugins];

  return webpackConfig;
}

function getAliases(options: BuildBuilderOptions): { [key: string]: string } {
  return options.fileReplacements.reduce(
    (aliases, replacement) => ({
      ...aliases,
      [replacement.replace]: replacement.with,
    }),
    {}
  );
}

// TODO  Sourcemap and cache options have been removed from plugin.
//  Investigate what this mgiht change in the build process
export function createTerserPlugin(esm: boolean, sourceMap: boolean) {
  // TODO(jack): Remove this in Nx 13 and go back to proper imports
  const { TerserWebpackPlugin } = require('../webpack/entry');
  return new TerserWebpackPlugin({
    parallel: true,
    terserOptions: {
      ecma: esm ? 8 : 5,
      safari10: true,
      output: {
        ascii_only: true,
        comments: false,
        webkit: true,
      },
    },
  });
}

// TODO(jack): Update the typing with new version of webpack -- was returning Stats.ToStringOptions in webpack 4
// The StatsOptions type needs to be exported from webpack
// PR: https://github.com/webpack/webpack/pull/12875
function getStatsConfig(options: BuildBuilderOptions): any {
  return {
    hash: true,
    timings: false,
    cached: false,
    cachedAssets: false,
    modules: false,
    warnings: true,
    errors: true,
    colors: !options.verbose && !options.statsJson,
    chunks: !options.verbose,
    assets: !!options.verbose,
    chunkOrigins: !!options.verbose,
    chunkModules: !!options.verbose,
    children: !!options.verbose,
    reasons: !!options.verbose,
    version: !!options.verbose,
    errorDetails: !!options.verbose,
    moduleTrace: !!options.verbose,
    usedExports: !!options.verbose,
    warningsFilter: IGNORED_WEBPACK_WARNINGS,
  };
}

// This is shamelessly taken from CRA and modified for NX use
// https://github.com/facebook/create-react-app/blob/4784997f0682e75eb32a897b4ffe34d735912e6c/packages/react-scripts/config/env.js#L71
function getClientEnvironment(mode) {
  // Grab NODE_ENV and NX_* environment variables and prepare them to be
  // injected into the application via DefinePlugin in webpack configuration.
  const NX_APP = /^NX_/i;

  const raw = Object.keys(process.env)
    .filter((key) => NX_APP.test(key))
    .reduce(
      (env, key) => {
        env[key] = process.env[key];
        return env;
      },
      {
        // Useful for determining whether we’re running in production mode.
        NODE_ENV: process.env.NODE_ENV || mode,
      }
    );

  // Stringify all values so we can feed into webpack DefinePlugin
  const stringified = {
    'process.env': Object.keys(raw).reduce((env, key) => {
      env[key] = JSON.stringify(raw[key]);
      return env;
    }, {}),
  };

  return { stringified };
}

export function createCopyPlugin(assets: AssetGlobPattern[]) {
  // TODO(jack): Remove this in Nx 13 and go back to proper imports
  const { CopyWebpackPlugin } = require('../webpack/entry');

  return new CopyWebpackPlugin({
    patterns: assets.map((asset) => {
      return {
        context: asset.input,
        // Now we remove starting slash to make Webpack place it from the output root.
        to: asset.output,
        from: asset.glob,
        globOptions: {
          ignore: [
            '.gitkeep',
            '**/.DS_Store',
            '**/Thumbs.db',
            ...(asset.ignore ?? []),
          ],
          dot: true,
        },
      };
    }),
  });
}
