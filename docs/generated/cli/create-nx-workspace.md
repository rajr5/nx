---
title: 'create-nx-workspace - CLI command'
description: 'Create a new Nx workspace'
---

# create-nx-workspace

Create a new Nx workspace

## Usage

```bash
create-nx-workspace [name] [options]
```

Install `create-nx-workspace` globally to invoke the command directly, or use `npx create-nx-workspace`, `yarn create nx-workspace`, or `pnpx create-nx-workspace`.

## Options

### allPrompts

Default: `false`

Show all prompts

### appName

The name of the application when a preset with pregenerated app is selected

### cli

Choices: `["nx", "angular"]`

CLI to power the Nx workspace

### defaultBase

Default: `main`

Default base to use for new projects

### help

Show help

### interactive

Enable interactive mode with presets

### name

Workspace name (e.g. org name)

### nxCloud

Default: `true`

Use Nx Cloud

### packageManager

Default: `npm`

Choices: `["npm", "pnpm", "yarn"]`

Package manager to use

### preset

Choices: `["apps", "empty", "core", "npm", "ts", "web-components", "angular", "angular-nest", "react", "react-express", "react-native", "next", "nest", "express"]`

Customizes the initial content of your workspace. To build your own see https://nx.dev/nx-plugin/overview#preset

### style

Style option to be used when a preset with pregenerated app is selected

### version

Show version number
