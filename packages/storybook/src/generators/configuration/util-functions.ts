import {
  generateFiles,
  joinPathFragments,
  logger,
  offsetFromRoot,
  readJson,
  readProjectConfiguration,
  toJS,
  Tree,
  updateJson,
  updateProjectConfiguration,
  writeJson,
} from '@nrwl/devkit';
import { Linter } from '@nrwl/linter';
import { join } from 'path';
import { dedupe, isFramework, TsConfig } from '../../utils/utilities';
import { StorybookConfigureSchema } from './schema';
import { getRootTsConfigPathInTree } from '@nrwl/workspace/src/utilities/typescript';

export function addStorybookTask(
  tree: Tree,
  projectName: string,
  uiFramework: string
) {
  if (uiFramework === '@storybook/react-native') {
    return;
  }
  const projectConfig = readProjectConfiguration(tree, projectName);
  projectConfig.targets['storybook'] = {
    executor: '@nrwl/storybook:storybook',
    options: {
      uiFramework,
      port: 4400,
      config: {
        configFolder: `${projectConfig.root}/.storybook`,
      },
    },
    configurations: {
      ci: {
        quiet: true,
      },
    },
  };
  projectConfig.targets['build-storybook'] = {
    executor: '@nrwl/storybook:build',
    outputs: ['{options.outputPath}'],
    options: {
      uiFramework,
      outputPath: joinPathFragments('dist/storybook', projectName),
      config: {
        configFolder: `${projectConfig.root}/.storybook`,
      },
    },
    configurations: {
      ci: {
        quiet: true,
      },
    },
  };

  updateProjectConfiguration(tree, projectName, projectConfig);
}

export function addAngularStorybookTask(
  tree: Tree,
  projectName: string,
  buildTargetForAngularProjects: string
) {
  const projectConfig = readProjectConfiguration(tree, projectName);
  projectConfig.targets['storybook'] = {
    executor: '@storybook/angular:start-storybook',
    options: {
      port: 4400,
      configDir: `${projectConfig.root}/.storybook`,
      browserTarget: `${projectName}:${
        buildTargetForAngularProjects ? 'build' : 'build-storybook'
      }`,
      compodoc: false,
    },
    configurations: {
      ci: {
        quiet: true,
      },
    },
  };
  projectConfig.targets['build-storybook'] = {
    executor: '@storybook/angular:build-storybook',
    outputs: ['{options.outputPath}'],
    options: {
      outputDir: joinPathFragments('dist/storybook', projectName),
      configDir: `${projectConfig.root}/.storybook`,
      browserTarget: `${projectName}:${
        buildTargetForAngularProjects ? 'build' : 'build-storybook'
      }`,
      compodoc: false,
    },
    configurations: {
      ci: {
        quiet: true,
      },
    },
  };

  updateProjectConfiguration(tree, projectName, projectConfig);
}

export function configureTsProjectConfig(
  tree: Tree,
  schema: StorybookConfigureSchema
) {
  const { name: projectName } = schema;

  let tsConfigPath: string;
  let tsConfigContent: TsConfig;

  try {
    tsConfigPath = getTsConfigPath(tree, projectName);
    tsConfigContent = readJson<TsConfig>(tree, tsConfigPath);
  } catch {
    /**
     * Custom app configurations
     * may contain a tsconfig.json
     * instead of a tsconfig.app.json.
     */

    tsConfigPath = getTsConfigPath(tree, projectName, 'tsconfig.json');
    tsConfigContent = readJson<TsConfig>(tree, tsConfigPath);
  }

  if (
    !tsConfigContent.exclude.includes('**/*.stories.ts') &&
    !tsConfigContent.exclude.includes('**/*.stories.js')
  ) {
    tsConfigContent.exclude = [
      ...(tsConfigContent.exclude || []),
      '**/*.stories.ts',
      '**/*.stories.js',
      ...(isFramework('react', schema) || isFramework('react-native', schema)
        ? ['**/*.stories.jsx', '**/*.stories.tsx']
        : []),
    ];
  }

  writeJson(tree, tsConfigPath, tsConfigContent);
}

export function configureTsSolutionConfig(
  tree: Tree,
  schema: StorybookConfigureSchema
) {
  const { name: projectName } = schema;

  const { root } = readProjectConfiguration(tree, projectName);
  const tsConfigPath = join(root, 'tsconfig.json');
  const tsConfigContent = readJson<TsConfig>(tree, tsConfigPath);

  if (
    !tsConfigContent.references
      ?.map((reference) => reference.path)
      ?.includes('./.storybook/tsconfig.json')
  ) {
    tsConfigContent.references = [
      ...(tsConfigContent.references || []),
      {
        path: './.storybook/tsconfig.json',
      },
    ];
  }

  writeJson(tree, tsConfigPath, tsConfigContent);
}

/**
 * When adding storybook we need to inform TSLint or ESLint
 * of the additional tsconfig.json file which will be the only tsconfig
 * which includes *.stories files.
 *
 * For TSLint this is done via the builder config, for ESLint this is
 * done within the .eslintrc.json file.
 */
export function updateLintConfig(tree: Tree, schema: StorybookConfigureSchema) {
  const { name: projectName } = schema;

  const { targets, root } = readProjectConfiguration(tree, projectName);
  const tslintTargets = Object.values(targets).filter(
    (target) => target.executor === '@angular-devkit/build-angular:tslint'
  );

  tslintTargets.forEach((target) => {
    target.options.tsConfig = dedupe([
      ...target.options.tsConfig,
      joinPathFragments(root, './.storybook/tsconfig.json'),
    ]);
  });

  if (tree.exists(join(root, '.eslintrc.json'))) {
    updateJson(tree, join(root, '.eslintrc.json'), (json) => {
      if (typeof json.parserOptions?.project === 'string') {
        json.parserOptions.project = [json.parserOptions.project];
      }

      if (Array.isArray(json.parserOptions?.project)) {
        json.parserOptions.project = dedupe([
          ...json.parserOptions.project,
          join(root, '.storybook/tsconfig.json'),
        ]);
      }

      const overrides = json.overrides || [];
      for (const o of overrides) {
        if (typeof o.parserOptions?.project === 'string') {
          o.parserOptions.project = [o.parserOptions.project];
        }
        if (Array.isArray(o.parserOptions?.project)) {
          o.parserOptions.project = dedupe([
            ...o.parserOptions.project,
            join(root, '.storybook/tsconfig.json'),
          ]);
        }
      }

      return json;
    });
  }
}

export function normalizeSchema(
  schema: StorybookConfigureSchema
): StorybookConfigureSchema {
  const defaults = {
    configureCypress: true,
    linter: Linter.TsLint,
    js: false,
  };
  return {
    ...defaults,
    ...schema,
  };
}

export function createRootStorybookDir(tree: Tree, js: boolean) {
  if (tree.exists('.storybook')) {
    logger.warn(
      `.storybook folder already exists at root! Skipping generating files in it.`
    );
    return;
  }
  logger.debug(`adding .storybook folder to the root directory`);

  const templatePath = join(__dirname, './root-files');
  generateFiles(tree, templatePath, '', {
    rootTsConfigPath: getRootTsConfigPathInTree(tree),
  });

  if (js) {
    toJS(tree);
  }
}

export function createProjectStorybookDir(
  tree: Tree,
  projectName: string,
  uiFramework: StorybookConfigureSchema['uiFramework'],
  js: boolean
) {
  const { root, projectType } = readProjectConfiguration(tree, projectName);
  const projectDirectory = projectType === 'application' ? 'app' : 'lib';

  const storybookRoot = join(root, '.storybook');

  if (tree.exists(storybookRoot)) {
    logger.warn(
      `.storybook folder already exists for ${projectName}! Skipping generating files in it.`
    );
    return;
  }

  logger.debug(`adding .storybook folder to ${projectDirectory}`);
  const templatePath = join(__dirname, './project-files');

  generateFiles(tree, templatePath, root, {
    tmpl: '',
    uiFramework,
    offsetFromRoot: offsetFromRoot(root),
    rootTsConfigPath: getRootTsConfigPathInTree(tree),
    projectType: projectDirectory,
    useWebpack5:
      uiFramework === '@storybook/angular' ||
      uiFramework === '@storybook/react',
    existsRootWebpackConfig: tree.exists('.storybook/webpack.config.js'),
  });

  if (js) {
    toJS(tree);
  }
}

export function getTsConfigPath(
  tree: Tree,
  projectName: string,
  path?: string
): string {
  const { root, projectType } = readProjectConfiguration(tree, projectName);
  return join(
    root,
    path && path.length > 0
      ? path
      : projectType === 'application'
      ? 'tsconfig.app.json'
      : 'tsconfig.lib.json'
  );
}
