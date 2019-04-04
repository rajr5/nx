import {
  Builder,
  BuilderConfiguration,
  BuildEvent,
  BuilderContext
} from '@angular-devkit/architect';

import { from, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import * as path from 'path';

try {
  require('dotenv').config();
} catch (e) {}

const { runCLI } = require('jest');

export interface JestBuilderOptions {
  codeCoverage?: boolean;
  jestConfig: string;
  testFile?: string;
  setupFile?: string;
  tsConfig: string;
  bail?: number | boolean;
  ci?: boolean;
  color?: boolean;
  json?: boolean;
  maxWorkers?: number;
  onlyChanged?: boolean;
  outputFile?: string;
  passWithNoTests?: boolean;
  runInBand?: boolean;
  silent?: boolean;
  testNamePattern?: string;
  updateSnapshot?: boolean;
  useStderr?: boolean;
  watch?: boolean;
  watchAll?: boolean;
}

export default class JestBuilder implements Builder<JestBuilderOptions> {
  constructor(private context: BuilderContext) {}
  run(
    builderConfig: BuilderConfiguration<JestBuilderOptions>
  ): Observable<BuildEvent> {
    const options = builderConfig.options;

    options.jestConfig = path.resolve(
      this.context.workspace.root,
      options.jestConfig
    );

    const tsJestConfig = {
      tsConfig: path.resolve(this.context.workspace.root, options.tsConfig),
      // Typechecking wasn't done in Jest 23 but is done in 24. This makes errors a warning to amend the breaking change for now
      // Remove for v8 to fail on type checking failure
      diagnostics: {
        warnOnly: true
      }
    };

    // TODO: This is hacky, We should probably just configure it in the user's workspace
    // If jest-preset-angular is installed, apply settings
    try {
      require.resolve('jest-preset-angular');
      Object.assign(tsJestConfig, {
        stringifyContentPathRegex: '\\.html$',
        astTransformers: [
          'jest-preset-angular/InlineHtmlStripStylesTransformer'
        ]
      });
    } catch (e) {}

    const config: any = {
      coverage: options.codeCoverage,
      bail: options.bail,
      ci: options.ci,
      color: options.color,
      json: options.json,
      maxWorkers: options.maxWorkers,
      onlyChanged: options.onlyChanged,
      outputFile: options.outputFile,
      passWithNoTests: options.passWithNoTests,
      runInBand: options.runInBand,
      silent: options.silent,
      testNamePattern: options.testNamePattern,
      updateSnapshot: options.updateSnapshot,
      useStderr: options.useStderr,
      watch: options.watch,
      watchAll: options.watchAll,
      globals: JSON.stringify({
        'ts-jest': tsJestConfig
      })
    };

    if (options.setupFile) {
      config.setupTestFrameworkScriptFile = path.join(
        '<rootDir>',
        path.relative(builderConfig.root, options.setupFile)
      );
    }

    if (options.testFile) {
      config._ = [options.testFile];
    }

    return from(runCLI(config, [options.jestConfig])).pipe(
      map((results: any) => {
        return {
          success: results.results.success
        };
      })
    );
  }
}
