# affected

Run task for affected projects

## Usage

```bash
nx affected
```

Install `@nrwl/cli` globally to invoke the command directly using `nx`, or use `npm run nx` or `yarn nx`.  
 ### Examples
Run custom target for all affected projects:

```bash
nx affected --target=custom-target
```

Run tests in parallel:

```bash
nx affected --target=test --parallel --maxParallel=5
```

Rerun the test target only for the projects that failed last time:

```bash
nx affected --target=test --only-failed
```

Run the test target for all projects:

```bash
nx affected --target=test --all
```

Run tests for all the projects affected by changing the index.ts file:

```bash
nx affected --target=test --files=libs/mylib/src/index.ts
```

Run tests for all the projects affected by the changes between master and HEAD (e.g., PR):

```bash
nx affected --target=test --base=master --head=HEAD
```

Run tests for all the projects affected by the last commit on master:

```bash
nx affected --target=test --base=master~1 --head=master
```

## Options

### all

All projects

### base

Base of the current branch (usually master)

### exclude

Default: ``

Exclude certain projects from being processed

### files

A list of files delimited by commas

### head

Latest commit of the current branch (usually HEAD)

### help

Show help

### maxParallel

Default: `3`

Max number of parallel processes

### only-failed

Default: `false`

Isolate projects which previously failed

### parallel

Default: `false`

Parallelize the command

### target

Task to run for affected projects

### uncommitted

Uncommitted changes

### untracked

Untracked changes

### verbose

Print additional error stack trace on failure

### version

Show version number
