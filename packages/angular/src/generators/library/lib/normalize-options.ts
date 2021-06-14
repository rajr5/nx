import { getWorkspaceLayout, Tree } from '@nrwl/devkit';
import { Schema } from '../schema';
import { NormalizedSchema } from './normalized-schema';
import { names } from '@nrwl/devkit';
import { Linter } from '@nrwl/linter';
import { UnitTestRunner } from '../../../utils/test-runners';

export function normalizeOptions(
  host: Tree,
  schema: Partial<Schema>
): NormalizedSchema {
  // Create a schema with populated default values
  const options: Schema = {
    buildable: false,
    enableIvy: false,
    linter: Linter.EsLint,
    name: '', // JSON validation will ensure this is set
    publishable: false,
    simpleModuleName: false,
    skipFormat: false,
    unitTestRunner: UnitTestRunner.Jest,
    ...schema,
  };

  const name = names(options.name).fileName;
  const projectDirectory = options.directory
    ? `${names(options.directory).fileName}/${name}`
    : name;

  const { libsDir, npmScope } = getWorkspaceLayout(host);

  const projectName = projectDirectory.replace(new RegExp('/', 'g'), '-');
  const fileName = options.simpleModuleName ? name : projectName;
  const projectRoot = `${libsDir}/${projectDirectory}`;

  const moduleName = `${names(fileName).className}Module`;
  const parsedTags = options.tags
    ? options.tags.split(',').map((s) => s.trim())
    : [];
  const modulePath = `${projectRoot}/src/lib/${fileName}.module.ts`;
  const defaultPrefix = npmScope;

  const importPath =
    options.importPath || `@${defaultPrefix}/${projectDirectory}`;

  return {
    ...options,
    prefix: options.prefix ?? defaultPrefix,
    name: projectName,
    projectRoot,
    entryFile: 'index',
    moduleName,
    projectDirectory,
    modulePath,
    parsedTags,
    fileName,
    importPath,
  };
}
