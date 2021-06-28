# Nx Plugins and Devkit

Nx is a VSCode of build tools. The core of Nx is project and task graph creation and analysis, orchestration and execution of tasks, computation caching, and code generation. The extended functionality of Nx is provided by [Nx plugins](#nx-plugins) built on top of the underlying [Nx Devkit](#nx-devkit).

## Nx plugins

Nx plugins are npm packages that contain generators and executors to extend the capabilities of an Nx workspace.

Plugins have:

- **Generators**

  - Generators automate making changes to the file system.
  - Anytime you run `nx generate ...`, you invoke a generator.
  - They are used to create/update applications, libraries, components, and more.

- **Executors**

  - Executors define how to perform an action on a project.
  - Anytime you run `nx run ...` (or `nx test`, `nx build`), you invoke an executor.
  - They are used to build applications and libraries, test them, lint them, and more.

All of the core plugins are written using Nx Devkit, and you can use the same utilities to write your own generators and executors.

The [Workspace Plugin](/{{framework}}/workspace/nrwl-workspace-overview) contains executors and generators that are included in every Nx workspace for you to use, and are used with other plugins.

The Nx team maintains a core set of plugins for many application and tooling frameworks. You can also extend an Nx workspace by writing your own plugins. The [Nx Plugin](/{{framework}}/nx-plugin/overview) plugin provides guidance on how you can build your own custom plugins.

### Listing Nx plugins

Nx provides a list of installed and available plugins from Nrwl and community maintainers. Plugins maintained by Nrwl maintained are scoped under the `@nrwl` organization.

Use the `nx list` command to display all registered plugins.

Using the `nx list [plugin]` command displays the generators and executors provided by that package.

## Nx Devkit

The Nx Devkit is the underlying technology used to customize Nx to support different technologies and custom use-cases. It contains many utility functions for reading and writing files, updating configuration, working with Abstract Syntax Trees(ASTs), and more.

### Pay as you go

As with most things in Nx, the core of Nx Devkit is very simple. It only uses language primitives and immutable objects (the tree being the only exception). See [Simplest Generator](/{{framework}}/generators/using-schematics#simplest-generator) and [Simplest Executor](/{{framework}}/executors/using-builders#simplest-executor) for examples on creating generators and executors. The [Using Executors](/{{framework}}/executors/using-builders) and [Using Generators](/{{framework}}/generators/using-schematics) guides also have additional information on executors and generators.

## Learn more

- [Workspace generators](/{{framework}}/generators/workspace-generators)
- [Workspace executors](/{{framework}}/executors/creating-custom-builders)
- [Nx Community Plugins](/community)
