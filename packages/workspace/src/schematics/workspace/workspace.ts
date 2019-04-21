import {
  apply,
  branchAndMerge,
  chain,
  mergeWith,
  Rule,
  SchematicContext,
  template,
  Tree,
  url
} from '@angular-devkit/schematics';
import { Schema } from './schema';
import { strings } from '@angular-devkit/core';
import {
  angularCliVersion,
  prettierVersion,
  typescriptVersion,
  nxVersion
} from '../../utils/versions';

export const DEFAULT_NRWL_PRETTIER_CONFIG = {
  singleQuote: true
};

export default function(options: Schema): Rule {
  if (!options.name) {
    throw new Error(`Invalid options, "name" is required.`);
  }

  return (host: Tree, context: SchematicContext) => {
    const npmScope = options.npmScope ? options.npmScope : options.name;
    const templateSource = apply(url('./files'), [
      template({
        utils: strings,
        dot: '.',
        tmpl: '',
        typescriptVersion,
        prettierVersion,
        angularCliVersion,
        nxVersion,
        ...(options as object),
        npmScope,
        defaultNrwlPrettierConfig: JSON.stringify(
          DEFAULT_NRWL_PRETTIER_CONFIG,
          null,
          2
        )
      })
    ]);
    return chain([branchAndMerge(chain([mergeWith(templateSource)]))])(
      host,
      context
    );
  };
}
