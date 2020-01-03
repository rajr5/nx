import { appRootPath } from '@nrwl/workspace/src/utils/app-root';
import {
  DepConstraint,
  findConstraintsFor,
  findProjectUsingImport,
  findSourceProject,
  getSourceFilePath,
  hasNoneOfTheseTags,
  isAbsoluteImportIntoAnotherProject,
  isCircular,
  isRelativeImportIntoAnotherProject,
  matchImportWithWildcard,
  onlyLoadChildren
} from '@nrwl/workspace/src/utils/runtime-lint-utils';
import { TSESTree } from '@typescript-eslint/experimental-utils';
import { createESLintRule } from '../utils/create-eslint-rule';
import { normalize } from '@angular-devkit/core';
import {
  createProjectGraph,
  ProjectGraph,
  ProjectType
} from '@nrwl/workspace/src/core/project-graph';
import {
  normalizedProjectRoot,
  readNxJson,
  readWorkspaceJson
} from '@nrwl/workspace/src/core/file-utils';

type Options = [
  {
    allow: string[];
    depConstraints: DepConstraint[];
  }
];
export type MessageIds =
  | 'noRelativeOrAbsoluteImportsAcrossLibraries'
  | 'noCircularDependencies'
  | 'noImportsOfApps'
  | 'noDeepImportsIntoLibraries'
  | 'noImportsOfLazyLoadedLibraries'
  | 'projectWithoutTagsCannotHaveDependencies'
  | 'tagConstraintViolation';
export const RULE_NAME = 'enforce-module-boundaries';

export default createESLintRule<Options, MessageIds>({
  name: RULE_NAME,
  meta: {
    type: 'suggestion',
    docs: {
      description: `Ensure that module boundaries are respected within the monorepo`,
      category: 'Best Practices',
      recommended: 'error'
    },
    fixable: 'code',
    schema: [
      {
        type: 'object',
        properties: {
          allow: [{ type: 'string' }],
          depConstraints: [
            {
              type: 'object',
              properties: {
                sourceTag: { type: 'string' },
                onlyDependOnLibsWithTags: [{ type: 'string' }]
              },
              additionalProperties: false
            }
          ]
        },
        additionalProperties: false
      }
    ],
    messages: {
      noRelativeOrAbsoluteImportsAcrossLibraries: `Library imports must start with @{{npmScope}}/`,
      noCircularDependencies: `Circular dependency between "{{sourceProjectName}}" and "{{targetProjectName}}" detected`,
      noImportsOfApps: 'Imports of apps are forbidden',
      noDeepImportsIntoLibraries: 'Deep imports into libraries are forbidden',
      noImportsOfLazyLoadedLibraries: `Imports of lazy-loaded libraries are forbidden`,
      projectWithoutTagsCannotHaveDependencies: `A project without tags cannot depend on any libraries`,
      tagConstraintViolation: `A project tagged with "{{sourceTag}}" can only depend on libs tagged with {{allowedTags}}`
    }
  },
  defaultOptions: [
    {
      allow: [],
      depConstraints: []
    }
  ],
  create(context, [{ allow, depConstraints }]) {
    /**
     * Globally cached info about workspace
     */
    const projectPath = normalize((global as any).projectPath || appRootPath);
    if (!(global as any).projectGraph) {
      const workspaceJson = readWorkspaceJson();
      const nxJson = readNxJson();
      (global as any).npmScope = nxJson.npmScope;
      (global as any).projectGraph = createProjectGraph(workspaceJson, nxJson);
    }
    const npmScope = (global as any).npmScope;
    const projectGraph = (global as any).projectGraph as ProjectGraph;
    return {
      ImportDeclaration(node: TSESTree.ImportDeclaration) {
        const imp = (node.source as TSESTree.Literal).value as string;

        const sourceFilePath = getSourceFilePath(
          normalize(context.getFilename()),
          projectPath
        );

        // whitelisted import
        if (allow.some(a => matchImportWithWildcard(a, imp))) {
          return;
        }

        // check for relative and absolute imports
        if (
          isRelativeImportIntoAnotherProject(
            imp,
            projectPath,
            projectGraph,
            sourceFilePath
          ) ||
          isAbsoluteImportIntoAnotherProject(imp)
        ) {
          context.report({
            node,
            messageId: 'noRelativeOrAbsoluteImportsAcrossLibraries',
            data: {
              npmScope
            }
          });
          return;
        }

        // check constraints between libs and apps
        if (imp.startsWith(`@${npmScope}/`)) {
          // we should find the name
          const sourceProject = findSourceProject(projectGraph, sourceFilePath);
          // findProjectUsingImport to take care of same prefix
          const targetProject = findProjectUsingImport(
            projectGraph,
            npmScope,
            imp
          );

          // something went wrong => return.
          if (!sourceProject || !targetProject) {
            return;
          }

          // check for circular dependency
          if (isCircular(projectGraph, sourceProject, targetProject)) {
            context.report({
              node,
              messageId: 'noCircularDependencies',
              data: {
                sourceProjectName: sourceProject.name,
                targetProjectName: targetProject.name
              }
            });
            return;
          }

          // same project => allow
          if (sourceProject === targetProject) {
            return;
          }

          // cannot import apps
          if (targetProject.type !== ProjectType.lib) {
            context.report({
              node,
              messageId: 'noImportsOfApps'
            });
            return;
          }

          // deep imports aren't allowed
          if (imp !== `@${npmScope}/${normalizedProjectRoot(targetProject)}`) {
            context.report({
              node,
              messageId: 'noDeepImportsIntoLibraries'
            });
            return;
          }

          // if we import a library using loadChildren, we should not import it using es6imports
          if (
            onlyLoadChildren(
              projectGraph,
              sourceProject.name,
              targetProject.name,
              []
            )
          ) {
            context.report({
              node,
              messageId: 'noImportsOfLazyLoadedLibraries'
            });
            return;
          }

          // check that dependency constraints are satisfied
          if (depConstraints.length > 0) {
            const constraints = findConstraintsFor(
              depConstraints,
              sourceProject
            );
            // when no constrains found => error. Force the user to provision them.
            if (constraints.length === 0) {
              context.report({
                node,
                messageId: 'projectWithoutTagsCannotHaveDependencies'
              });
              return;
            }

            for (let constraint of constraints) {
              if (
                hasNoneOfTheseTags(
                  targetProject,
                  constraint.onlyDependOnLibsWithTags || []
                )
              ) {
                const allowedTags = constraint.onlyDependOnLibsWithTags
                  .map(s => `"${s}"`)
                  .join(', ');
                context.report({
                  node,
                  messageId: 'tagConstraintViolation',
                  data: {
                    sourceTag: constraint.sourceTag,
                    allowedTags
                  }
                });
                return;
              }
            }
          }
        }
      }
    };
  }
});
