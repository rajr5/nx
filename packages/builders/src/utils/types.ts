import { FileReplacement } from './normalize';
import { AssetPattern } from '@angular-devkit/build-angular';
import { Path } from '@angular-devkit/core';

export interface OptimizationOptions {
  scripts: boolean;
  styles: boolean;
}

export interface SourceMapOptions {
  scripts: boolean;
  styles: boolean;
  vendors: boolean;
  hidden: boolean;
}

export interface BuildBuilderOptions {
  main: string;
  outputPath: string;
  tsConfig: string;
  watch?: boolean;
  sourceMap?: boolean | SourceMapOptions;
  optimization?: boolean | OptimizationOptions;
  showCircularDependencies?: boolean;
  maxWorkers?: number;
  poll?: number;

  fileReplacements: FileReplacement[];
  assets?: AssetPattern[];

  progress?: boolean;
  statsJson?: boolean;
  extractLicenses?: boolean;

  webpackConfig?: string;

  root?: string;
  sourceRoot?: Path;
}
