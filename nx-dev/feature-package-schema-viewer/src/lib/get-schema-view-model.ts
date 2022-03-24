import {
  getSchemaFromReference,
  InternalLookup,
  Lookup,
} from '@nrwl/nx-dev/data-access-packages';
import {
  JsonSchema,
  NxSchema,
  SchemaMetadata,
} from '@nrwl/nx-dev/models-package';
import { ParsedUrlQuery } from 'querystring';
import { Errors, Example, generateJsonExampleFor } from './examples';
import { SchemaRequest } from './schema-request.models';

function getReferenceFromQuery(query: string): string {
  return query.replace('root/', '#/');
}

export interface SchemaViewModel {
  packageName: string;
  /**
   * TODO@ben: Remove this property when there is nor more consumer.
   * @Deprecated Will be removed. We are switching to internal linking, use "packageUrl".
   */
  packageGithubUrl: string;
  packageUrl: string;
  schemaGithubUrl: string;
  schemaMetadata: SchemaMetadata;
  rootReference: string;
  subReference: string;
  lookup: Lookup;
  currentSchema: NxSchema | null;
  currentSchemaExamples: Example | Errors;
  type: 'executors' | 'generators';
}

export function getSchemaViewModel(
  routerQuery: ParsedUrlQuery,
  schemaRequest: SchemaRequest
): SchemaViewModel | null {
  const schemaMetadata = schemaRequest.pkg[schemaRequest.type].find(
    (s) => s.name === schemaRequest.schemaName
  );
  if (!schemaMetadata) return null;

  return {
    schemaMetadata,
    packageName: `@nrwl/${schemaRequest.pkg.name}`,
    packageGithubUrl: schemaRequest.pkg.githubRoot + schemaRequest.pkg.root,
    packageUrl: `/packages/${schemaRequest.pkg.name}`,
    schemaGithubUrl: schemaRequest.pkg.githubRoot + schemaMetadata.path,
    rootReference: '#',
    subReference:
      Object.prototype.hasOwnProperty.call(routerQuery, 'ref') &&
      !Array.isArray(routerQuery['ref'])
        ? getReferenceFromQuery(String(routerQuery['ref']))
        : '',
    lookup: new InternalLookup(schemaMetadata.schema as JsonSchema),
    get currentSchema() {
      return (
        (getSchemaFromReference(this.rootReference, this.lookup) as NxSchema) ??
        null
      );
    },
    get currentSchemaExamples() {
      return generateJsonExampleFor(
        this.schemaMetadata.schema as JsonSchema,
        this.lookup,
        'both'
      );
    },
    type: schemaRequest.type,
  };
}
