---
title: 'print-affected - CLI command'
description: 'Prints information about the projects and targets affected by changes'
---

# print-affected

Prints information about the projects and targets affected by changes

## Usage

```bash
nx print-affected
```

[Install `nx` globally](/getting-started/nx-setup#install-nx) to invoke the command directly using `nx`, or use `npx nx`, `yarn nx`, or `pnpx nx`.

### Examples

Print information about affected projects and the project graph:

```bash
nx print-affected
```

Print information about the projects affected by the changes between main and HEAD (e.g,. PR):

```bash
nx print-affected --base=main --head=HEAD
```

Prints information about the affected projects and a list of tasks to test them:

```bash
nx print-affected --target=test
```

Prints the projects property from the print-affected output:

```bash
nx print-affected --target=build --select=projects
```

Prints the tasks.target.project property from the print-affected output:

```bash
nx print-affected --target=build --select=tasks.target.project
```

## Options

### all

Type: boolean

All projects

### base

Type: string

Base of the current branch (usually main)

### configuration

Type: string

This is the configuration to use when performing tasks on projects

### exclude

Type: array

Default: []

Exclude certain projects from being processed

### files

Type: array

Change the way Nx is calculating the affected command by providing directly changed files, list of files delimited by commas

### head

Type: string

Latest commit of the current branch (usually HEAD)

### help

Type: boolean

Show help

### ~~only-failed~~

Type: boolean

Default: false

**Deprecated:** The command to rerun failed projects will appear if projects fail. This now does nothing and will be removed in v15.

Isolate projects which previously failed

### runner

Type: string

This is the name of the tasks runner configured in nx.json

### select

Type: string

Select the subset of the returned json document (e.g., --selected=projects)

### skip-nx-cache

Type: boolean

Default: false

Rerun the tasks even when the results are available in the cache

### uncommitted

Type: boolean

Uncommitted changes

### untracked

Type: boolean

Untracked changes

### verbose

Print additional error stack trace on failure

### version

Type: boolean

Show version number
