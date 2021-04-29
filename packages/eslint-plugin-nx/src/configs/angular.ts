import angularEslintPlugin from '@angular-eslint/eslint-plugin';

/**
 * This configuration is intended to be applied to ALL .ts files in Angular
 * projects within an Nx workspace.
 *
 * It should therefore NOT contain any rules or plugins which are related to
 * Angular Templates, or more cross-cutting concerns which are not specific
 * to Angular.
 *
 * This configuration is intended to be combined with other configs from this
 * package.
 */
export default {
  env: {
    browser: true,
    es6: true,
    node: true,
  },
  plugins: ['@angular-eslint'],
  extends: [
    'plugin:@angular-eslint/recommended',
    /**
     * TODO: Consider dropping this extends and explicitly carrying over rules we care about
     * into our typescript preset in v13
     */
    ...(angularEslintPlugin?.configs?.['recommended--extra']
      ? ['plugin:@angular-eslint/recommended--extra']
      : []),
  ],
  rules: {},
};
