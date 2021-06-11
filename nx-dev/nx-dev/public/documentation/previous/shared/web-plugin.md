# Nx Plugin for Web

The Nx Plugin for Web Components contains generators for managing Web Component applications and libraries within an Nx workspace. It provides:

- Integration with libraries such as Jest, Cypress, and Storybook.
- Scaffolding for creating buildable libraries that can be published to npm.
- Utilities for automatic workspace refactoring.

## Adding the Web plugin

Adding the Web plugin to a workspace can be done with the following:

```shell script
#yarn
yarn add -D @nrwl/web
```

```shell script
#npm
npm install -D @nrwl/web
```

> Note: You can create a new workspace that has Web Components set up by doing `npx create-nx-workspace@latest --preset=web-components`

The file structure for a Web Components application looks like:

```treeview
myorg/
├── apps/
│   ├── todos/
│   │   ├── src/
│   │   │   ├── app/
│   │   │   ├── assets/
│   │   │   ├── environments/
│   │   │   ├── favicon.ico
│   │   │   ├── index.html
│   │   │   ├── main.ts
│   │   │   ├── polyfills.ts
│   │   │   └── styles.css
│   │   ├── browserslist
│   │   ├── jest.config.js
│   │   ├── tsconfig.app.json
│   │   ├── tsconfig.json
│   │   └── tsconfig.spec.json
│   └── todos-e2e/
│       ├── src/
│       │   ├── fixtures/
│       │   │   └── example.json
│       │   ├── integration/
│       │   │   └── app.spec.ts
│       │   ├── plugins/
│       │   │   └── index.ts
│       │   └── support/
│       │       ├── app.po.ts
│       │       ├── commands.ts
│       │       └── index.ts
│       ├── cypress.json
│       ├── tsconfig.e2e.json
│       └── tsconfig.json
├── libs/
├── tools/
├── README.md
├── workspace.json
├── nx.json
├── package.json
└── tsconfig.json
```

## See Also

- [Using Cypress](/{{framework}}/cypress/overview)
- [Using Jest](/{{framework}}/cypress/overview)

## Executors / Builders

- [build](/{{framework}}/web/build) - Builds a web components application
- [dev-server](/{{framework}}/web/dev-server) - Builds and serves a web application
- [package](/{{framework}}/web/package) - Bundles artifacts for a buildable library that can be distributed as an NPM package.

## Generators

- [application](/{{framework}}/web/application) - Create an Web Components application
