import * as ts from 'typescript';
import { addInitialRoutes } from '../../../utils/ast-utils';
import { NormalizedSchema } from '../schema';
import {
  reactRouterDomVersion,
  typesReactRouterDomVersion,
} from '../../../utils/versions';
import {
  joinPathFragments,
  Tree,
  StringInsertion,
  applyChangesToString,
  addDependenciesToPackageJson,
} from '@nrwl/devkit';

export function addRouting(host: Tree, options: NormalizedSchema) {
  if (!options.routing) {
    return;
  }

  const appPath = joinPathFragments(
    options.appProjectRoot,
    maybeJs(options, `src/app/${options.fileName}.tsx`)
  );
  const appFileContent = host.read(appPath).toString('utf-8');
  const appSource = ts.createSourceFile(
    appPath,
    appFileContent,
    ts.ScriptTarget.Latest,
    true
  );

  const changes = applyChangesToString(
    appFileContent,
    addInitialRoutes(appPath, appSource)
  );
  host.write(appPath, changes);

  addDependenciesToPackageJson(
    host,
    { 'react-router-dom': reactRouterDomVersion },
    { '@types/react-router-dom': typesReactRouterDomVersion }
  );
}

function maybeJs(options: NormalizedSchema, path: string): string {
  return options.js && (path.endsWith('.ts') || path.endsWith('.tsx'))
    ? path.replace(/\.tsx?$/, '.js')
    : path;
}
