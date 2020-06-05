import { chain, SchematicContext, Tree } from '@angular-devkit/schematics';
import { formatFiles, updateWorkspaceInTree } from '@nrwl/workspace';

function updateExcludePattern(host: Tree, context: SchematicContext) {
  return updateWorkspaceInTree((json) => {
    Object.keys(json.projects).forEach((name) => {
      const p = json.projects[name];
      const faultyPattern = `!${p.root}/**`;
      const builders = [
        '@nrwl/linter:lint',
        '@angular-devkit/build-angular:tslint',
      ];
      if (
        builders.includes(p.architect?.lint.builder) &&
        p.architect?.lint.options?.exclude.includes(faultyPattern)
      ) {
        const index: number = p.architect?.lint.options?.exclude.indexOf(
          faultyPattern
        );
        p.architect.lint.options.exclude[index] = faultyPattern + '/*';
      }
    });
    return json;
  });
}

export default function () {
  return chain([updateExcludePattern, formatFiles()]);
}
