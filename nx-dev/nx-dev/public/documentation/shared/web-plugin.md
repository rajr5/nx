# Nx Plugin for Web

The Nx Plugin for Web Components contains generators for managing Web Component applications and libraries within an Nx workspace. It provides:

- Integration with libraries such as Jest, Cypress, and Storybook.
- Scaffolding for creating buildable libraries that can be published to npm.
- Utilities for automatic workspace refactoring.

## Setting Up Web

To create a new workspace with web, run `npx create-nx-workspace@latest --preset=web`.

To add the web plugin to an existing workspace, run one of the following:

```bash
# For npm users
npm install -D @nrwl/web

# For yarn users
yarn add -D @nrwl/web
```

### Creating Applications

You can add a new application with the following:

```bash
nx g @nrwl/web:app my-new-app
```

The application uses no framework and generates with web components. You can add any framework you want on top of the default setup.

**Note:** If you are looking to start a React application, check out the [React plugin](/react/overview).

### Creating Libraries

To create a generic TypeScript library (i.e. non-framework specific), use the [`@nrwl/js`](/js/overview) plugin.

```bash
nx g @nrwl/js:lib my-new-lib
```

## Using Web

### Testing Projects

You can run unit tests with:

```bash
nx test my-new-app
nx test my-new-lib
```

Replace `my-new-app` with the name or your project. This command works for both applications and libraries.

You can also run E2E tests for applications:

```bash
nx e2e my-new-app-e2e
```

Replace `my-new-app-e2e` with the name or your project with `-e2e` appended.

### Building Projects

React applications can be build with:

```bash
nx build my-new-app
```

And if you generated a library with `--buildable`, then you can build a library as well:

```bash
nx build my-new-lib
```

The output is in the `dist` folder. You can customize the output folder by setting `outputPath` in the project's `project.json` file.

The application in `dist` is deployable, and you can try it out locally with:

```bash
npx http-server dist/apps/my-new-app
```

The library in `dist` is publishable to npm or a private registry.

## More Documentation

- [Using Cypress](/cypress/overview)
- [Using Jest](/cypress/overview)

## Executors / Builders

- [build](/web/build) - Builds a web components application
- [dev-server](/web/dev-server) - Builds and serves a web application
- [package](/web/package) - Bundles artifacts for a buildable library that can be distributed as an NPM package.

## Generators

- [application](/web/application) - Create an Web Components application
