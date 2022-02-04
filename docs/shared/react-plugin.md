# React Plugin

![React Logo](/shared/react-logo.png)

The React plugin contains executors and generators for managing React applications and libraries within an Nx workspace.
It provides:

- Integration with libraries such as Jest, Cypress, and Storybook.
- Generators for applications, libraries, components, hooks, and more.
- Library build support for publishing packages to npm or other registries.
- Utilities for automatic workspace refactoring.

## Setting Up React

To create a new workspace with React, run `npx create-nx-workspace@latest --preset=react`.

To add the React plugin to an existing workspace, run one of the following:

```bash
# For npm users
npm install -D @nrwl/react

# For yarn users
yarn add -D @nrwl/react
```

### Creating Applications and Libraries

You can add a new application with the following:

```bash
nx g @nrwl/react:app my-new-app
```

To start the application in development mode, run `nx serve my-new-app`.

And add a new library as follows:

```bash
nx g @nrwl/react:lib my-new-lib

# If you want the library to be buildable or publishable to npm
nx g @nrwl/react:lib my-new-lib --buildable
nx g @nrwl/react:lib my-new-lib \
--publishable \
--importPath=@myorg/my-new-lib
```

Read more about [building and publishing libraries here](/structure/buildable-and-publishable-libraries).

### Creating Components

Adding a component to an existing project can be done with:

```bash
nx g @nrwl/react:component my-new-component \
--project=my-new-app

# Note: If you want to export the component
# from the library use  --export
nx g @nrwl/react:component my-new-component \
--project=my-new-lib \
--export
```

Replace `my-new-app` and `my-new-lib` with the name of your projects.

### Creating Hooks

If you want to add a new hook, run the following

```bash
nx g @nrwl/react:hook my-new-hook --project=my-new-lib
```

Replace `my-new-lib` with the name of your project.

## Using React

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

The output is in the `dist` folder. You can customize the output folder by setting `outputPath` in the
project's `project.json` file.

The application in `dist` is deployable, and you can try it out locally with:

```bash
npx http-server dist/apps/my-new-app
```

The library in `dist` is publishable to npm or a private registry.

## More Documentation

- [Using Cypress](/cypress/overview)
- [Using Jest](/jest/overview)
- [Using Storybook](/storybook/overview-react)
