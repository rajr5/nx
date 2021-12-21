# Intro to Nx

Nx is a smart and extensible build framework to help you architect, test, and build at any scale — integrating seamlessly with modern technologies and frameworks while providing a distributed graph-based task execution, computation caching, smart rebuilds of affected projects, powerful code generators, editor support, GitHub apps, and more.

Nx helps you develop [Angular](/{{framework}}/angular/overview) applications with fully integrated support for
modern tools and libraries like [Jest](/{{framework}}/jest/overview), [Cypress](/{{framework}}/cypress/overview),
[ESLint](/{{framework}}/linter/eslint), [Storybook](/{{framework}}/storybook/overview), [NgRx](/angular/guides/misc-ngrx) and more.

## 10-Minute Nx Overview

<iframe width="560" height="315" src="https://www.youtube.com/embed/cXOkmOy-8dk" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"></iframe>

## Philosophy

Nx is built on a technology agnostic core that maintains modular units of code and understands the dependency graph between them. Developers comprehend that your app contains two pages that each use a shared button component. Nx uses this same knowledge to provide insights and performance improvements. There's a whole ecosystem of plugins that build on this foundation.

Nx becomes more valuable as you scale, solving problems that are frustrating for small teams, but paralyzing for large teams.

Nx works especially well for [monorepos](/{{framework}}/core-concepts/why-monorepos). Each new app added to a monorepo provides more opportunities to share code and tooling but that often comes at the cost of a compounding slowdown in the CI pipeline. Nx ensures that adding another app to the repo does not increase the existing app’s test or build time.

## Features

**Best-in-Class Support for Monorepos**

- [Smart rebuilds of affected projects](/{{framework}}/core-concepts/mental-model)
- [Distributed task execution & computation caching](/{{framework}}/core-concepts/mental-model)
- [Code sharing and ownership management](/{{framework}}/structure/monorepo-tags)

**Nx Integrated Development Experience**

- [High-quality editor plugins](/{{framework}}/getting-started/console) & [GitHub apps](https://github.com/apps/nx-cloud)
- [Powerful code generators](/{{framework}}/generators/using-schematics)
- [Workspace visualizations](/{{framework}}/structure/dependency-graph)

**Supports Your Ecosystem**

- [Rich plugin ecosystem](/{{framework}}/core-concepts/nx-devkit) from Nrwl and the [community](/community)
- Consistent dev experience for any framework
- [Automatic upgrade to the latest versions of all frameworks and tools](/{{framework}}/core-concepts/updating-nx)

## Learn Nx Fundamentals

- [Interactive Nx Tutorial (with videos)](/{{framework}}/tutorial/01-create-application)
- [Free Nx Course on YouTube](https://www.youtube.com/watch?time_continue=49&v=2mYLe9Kp9VM&feature=emb_logo)
- [45-Minute Walkthrough on YouTube](https://www.youtube.com/watch?v=h5FIGDn5YM0)
- [Nx CLI](/{{framework}}/getting-started/nx-cli)
- [Configuration Files](/{{framework}}/core-concepts/configuration)
- [Mental Model](/{{framework}}/core-concepts/mental-model)
