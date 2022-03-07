import {
  addProjectConfiguration,
  convertNxGenerator,
  formatFiles,
  generateFiles,
  GeneratorCallback,
  getWorkspaceLayout,
  joinPathFragments,
  names,
  offsetFromRoot,
  ProjectConfiguration,
  toJS,
  Tree,
  updateJson,
} from '@nrwl/devkit';
import { jestProjectGenerator } from '@nrwl/jest';
import { Linter, lintProjectGenerator } from '@nrwl/linter';
import { runTasksInSerial } from '@nrwl/workspace/src/utilities/run-tasks-in-serial';
import { join } from 'path';
import { LibraryGeneratorSchema } from '../../utils/schema';
import { addSwcConfig } from '../../utils/swc/add-swc-config';
import { addSwcDependencies } from '../../utils/swc/add-swc-dependencies';

export async function libraryGenerator(
  tree: Tree,
  schema: LibraryGeneratorSchema
) {
  const { libsDir } = getWorkspaceLayout(tree);
  return projectGenerator(tree, schema, libsDir, join(__dirname, './files'));
}

export async function projectGenerator(
  tree: Tree,
  schema: LibraryGeneratorSchema,
  destinationDir: string,
  filesDir: string
) {
  const options = normalizeOptions(tree, schema, destinationDir);

  createFiles(tree, options, `${filesDir}/lib`);

  addProject(tree, options, destinationDir);

  if (!schema.skipTsConfig) {
    updateRootTsConfig(tree, options);
  }

  const tasks: GeneratorCallback[] = [];

  if (options.linter !== 'none') {
    const lintCallback = await addLint(tree, options);
    tasks.push(lintCallback);
  }
  if (options.unitTestRunner === 'jest') {
    const jestCallback = await addJest(tree, options);
    tasks.push(jestCallback);
    if (options.compiler === 'swc') {
      replaceJestConfig(tree, options, `${filesDir}/jest-config`);
    }
  }

  if (!options.skipFormat) {
    await formatFiles(tree);
  }

  return runTasksInSerial(...tasks);
}

export interface NormalizedSchema extends LibraryGeneratorSchema {
  name: string;
  fileName: string;
  projectRoot: string;
  projectDirectory: string;
  parsedTags: string[];
  importPath?: string;
}

function addProject(
  tree: Tree,
  options: NormalizedSchema,
  destinationDir: string
) {
  const projectConfiguration: ProjectConfiguration = {
    root: options.projectRoot,
    sourceRoot: joinPathFragments(options.projectRoot, 'src'),
    targets: {},
    tags: options.parsedTags,
  };

  if (options.buildable && options.config != 'npm-scripts') {
    projectConfiguration.targets.build = {
      executor: `@nrwl/js:${options.compiler}`,
      outputs: ['{options.outputPath}'],
      options: {
        outputPath: `dist/${destinationDir}/${options.projectDirectory}`,
        main: `${options.projectRoot}/src/index` + (options.js ? '.js' : '.ts'),
        tsConfig: `${options.projectRoot}/tsconfig.lib.json`,
        assets: [`${options.projectRoot}/*.md`],
      },
    };

    if (options.compiler === 'swc' && options.skipTypeCheck) {
      projectConfiguration.targets.build.options.skipTypeCheck = true;
    }
  }

  if (options.config === 'workspace') {
    addProjectConfiguration(tree, options.name, projectConfiguration, false);
  } else if (options.config === 'project') {
    addProjectConfiguration(tree, options.name, projectConfiguration, true);
  } else {
    addProjectConfiguration(
      tree,
      options.name,
      {
        root: projectConfiguration.root,
        tags: projectConfiguration.tags,
        targets: {},
      },
      true
    );
  }
}

export function addLint(
  tree: Tree,
  options: NormalizedSchema
): Promise<GeneratorCallback> {
  return lintProjectGenerator(tree, {
    project: options.name,
    linter: options.linter,
    skipFormat: true,
    tsConfigPaths: [
      joinPathFragments(options.projectRoot, 'tsconfig.lib.json'),
    ],
    eslintFilePatterns: [
      `${options.projectRoot}/**/*.${options.js ? 'js' : 'ts'}`,
    ],
    setParserOptionsProject: options.setParserOptionsProject,
  });
}

function updateTsConfig(tree: Tree, options: NormalizedSchema) {
  updateJson(tree, join(options.projectRoot, 'tsconfig.json'), (json) => {
    if (options.strict) {
      json.compilerOptions = {
        ...json.compilerOptions,
        forceConsistentCasingInFileNames: true,
        strict: true,
        noImplicitOverride: true,
        noPropertyAccessFromIndexSignature: true,
        noImplicitReturns: true,
        noFallthroughCasesInSwitch: true,
      };
    }

    return json;
  });
}

function createFiles(tree: Tree, options: NormalizedSchema, filesDir: string) {
  const { className, name, propertyName } = names(options.name);

  generateFiles(tree, filesDir, options.projectRoot, {
    ...options,
    dot: '.',
    className,
    name,
    propertyName,
    js: !!options.js,
    cliCommand: 'nx',
    strict: undefined,
    tmpl: '',
    offsetFromRoot: offsetFromRoot(options.projectRoot),
    buildable: options.buildable === true,
    hasUnitTestRunner: options.unitTestRunner !== 'none',
  });

  if (options.buildable && options.compiler === 'swc') {
    addSwcDependencies(tree);
    addSwcConfig(tree, options.projectRoot);
  }

  if (options.unitTestRunner === 'none') {
    tree.delete(
      join(options.projectRoot, 'src/lib', `${options.fileName}.spec.ts`)
    );
    tree.delete(
      join(options.projectRoot, 'src/app', `${options.fileName}.spec.ts`)
    );
  }

  if (options.js) {
    toJS(tree);
  }

  const packageJsonPath = join(options.projectRoot, 'package.json');
  if (options.config === 'npm-scripts') {
    updateJson(tree, packageJsonPath, (json) => {
      json.scripts = {
        build: "echo 'implement build'",
        test: "echo 'implement test'",
      };
      return json;
    });
  } else if (!options.buildable) {
    tree.delete(packageJsonPath);
  }

  updateTsConfig(tree, options);
}

async function addJest(
  tree: Tree,
  options: NormalizedSchema
): Promise<GeneratorCallback> {
  return await jestProjectGenerator(tree, {
    project: options.name,
    setupFile: 'none',
    supportTsx: false,
    skipSerializers: true,
    testEnvironment: options.testEnvironment,
    skipFormat: true,
    compiler: options.compiler,
  });
}

function replaceJestConfig(
  tree: Tree,
  options: NormalizedSchema,
  filesDir: string
) {
  // remove the generated jest config by Jest generator
  tree.delete(join(options.projectRoot, 'jest.config.js'));

  // replace with JS:SWC specific jest config
  generateFiles(tree, filesDir, options.projectRoot, {
    tmpl: '',
    project: options.name,
    offsetFromRoot: offsetFromRoot(options.projectRoot),
    projectRoot: options.projectRoot,
  });
}

function normalizeOptions(
  tree: Tree,
  options: LibraryGeneratorSchema,
  destinationDir: string
): NormalizedSchema {
  if (options.publishable) {
    if (!options.importPath) {
      throw new Error(
        `For publishable libs you have to provide a proper "--importPath" which needs to be a valid npm package name (e.g. my-awesome-lib or @myorg/my-lib)`
      );
    }
    options.buildable = true;
  }

  if (options.config === 'npm-scripts') {
    options.unitTestRunner = 'none';
    options.linter = Linter.None;
    options.buildable = false;
  }
  options.compiler ??= 'tsc';

  if (options.compiler === 'swc' && options.skipTypeCheck == null) {
    options.skipTypeCheck = false;
  }

  const name = names(options.name).fileName;
  const projectDirectory = options.directory
    ? `${names(options.directory).fileName}/${name}`
    : name;

  if (!options.unitTestRunner && options.config !== 'npm-scripts') {
    options.unitTestRunner = 'jest';
  }

  if (!options.linter && options.config !== 'npm-scripts') {
    options.linter = Linter.EsLint;
  }

  const projectName = projectDirectory.replace(new RegExp('/', 'g'), '-');
  const fileName = getCaseAwareFileName({
    fileName: options.simpleModuleName ? name : projectName,
    pascalCaseFiles: options.pascalCaseFiles,
  });

  const { npmScope } = getWorkspaceLayout(tree);

  const projectRoot = joinPathFragments(destinationDir, projectDirectory);

  const parsedTags = options.tags
    ? options.tags.split(',').map((s) => s.trim())
    : [];

  const defaultImportPath = `@${npmScope}/${projectDirectory}`;
  const importPath = options.importPath || defaultImportPath;

  return {
    ...options,
    fileName,
    name: projectName,
    projectRoot,
    projectDirectory,
    parsedTags,
    importPath,
  };
}

function getCaseAwareFileName(options: {
  pascalCaseFiles: boolean;
  fileName: string;
}) {
  const normalized = names(options.fileName);

  return options.pascalCaseFiles ? normalized.className : normalized.fileName;
}

function updateRootTsConfig(host: Tree, options: NormalizedSchema) {
  updateJson(host, 'tsconfig.base.json', (json) => {
    const c = json.compilerOptions;
    c.paths = c.paths || {};
    delete c.paths[options.name];

    if (c.paths[options.importPath]) {
      throw new Error(
        `You already have a library using the import path "${options.importPath}". Make sure to specify a unique one.`
      );
    }

    c.paths[options.importPath] = [
      joinPathFragments(
        options.projectRoot,
        './src',
        'index.' + (options.js ? 'js' : 'ts')
      ),
    ];

    return json;
  });
}

export default libraryGenerator;
export const librarySchematic = convertNxGenerator(libraryGenerator);
