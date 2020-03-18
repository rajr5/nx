import { SchematicContext, Tree } from '@angular-devkit/schematics';
import {
  getWorkspace,
  NxJson,
  readJsonInTree,
  serializeJson
} from '@nrwl/workspace';
import { from, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Schema } from '../schema';

/**
 * Updates the tsconfig paths to remove the project.
 *
 * @param schema The options provided to the schematic
 */
export function updateTsconfig(schema: Schema) {
  return (tree: Tree, _context: SchematicContext): Observable<Tree> => {
    return from(getWorkspace(tree)).pipe(
      map(workspace => {
        const nxJson = readJsonInTree<NxJson>(tree, 'nx.json');
        const project = workspace.projects.get(schema.projectName);

        const tsConfigPath = 'tsconfig.json';
        if (tree.exists(tsConfigPath)) {
          let contents = JSON.parse(tree.read(tsConfigPath).toString('utf-8'));
          delete contents.compilerOptions.paths[
            `@${nxJson.npmScope}/${project.root.substr(5)}`
          ];
          tree.overwrite(tsConfigPath, serializeJson(contents));
        }

        return tree;
      })
    );
  };
}
