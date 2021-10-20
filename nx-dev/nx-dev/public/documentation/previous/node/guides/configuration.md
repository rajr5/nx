# Configuration

There are three top-level configuration files every Nx workspace has: `workspace.json`, `nx.json`, and `tsconfig.base.json`. Many Nx plugins modify these files when generating new code, but you can also modify them manually.

## workspace.json

The `workspace.json` configuration file contains information about the targets and generators. Let's look at the following example:

```json
{
  "version": 2,
  "projects": {
    "myapp": {
      "root": "apps/myapp/",
      "sourceRoot": "apps/myapp/src",
      "projectType": "application",
      "targets": {
        "build": {
          "executor": "@nrwl/node:build",
          "outputs": ["dist/apps/myapp"],
          "dependsOn": [
            {
              "target": "build",
              "projects": "dependencies"
            }
          ],
          "options": {
            "outputPath": "dist/packages/myapp",
            "main": "packages/myapp/src/main.ts",
            "tsConfig": "packages/myapp/tsconfig.app.json",
            "assets": ["packages/myapp/src/assets"]
          },
          "configurations": {
            "production": {
              "optimization": true
            }
          }
        },
        "serve": {
          "executor": "@nrwl/node:execute",
          "options": {
            "buildTarget": "myapp:build"
          }
        },
        "test": {
          "executor": "@nrwl/jest:jest",
          "options": {
            "jestConfig": "apps/myapp/jest.config.js"
          }
        }
      }
    },
    "mylib": {
      "root": "libs/mylib/",
      "sourceRoot": "libs/mylib/src",
      "projectType": "library",
      "targets": {
        "test": {
          "executor": "@nrwl/jest:jest",
          "options": {
            "jestConfig": "libs/mylib/jest.config.js",
            "tsConfig": "libs/mylib/tsconfig.spec.json"
          }
        },
        "build": {
          "executor": "@nrwl/node:package",
          "options": {
            "outputPath": "dist/libs/mylib",
            "tsConfig": "libs/mylib/tsconfig.lib.json",
            "packageJson": "libs/mylib/package.json",
            "main": "libs/mylib/src/index.ts",
            "assets": ["libs/mylib/*.md"]
          }
        }
      }
    }
  },
  "cli": {
    "defaultCollection": "@nrwl/node"
  },
  "generators": {
    "@nrwl/node:library": {
      "js": true
    }
  }
}
```

### Projects

The `projects` property configures all apps and libs.

For instance, the following configures `mylib`.

```json
{
  "mylib": {
    "root": "libs/mylib/",
    "sourceRoot": "libs/mylib/src",
    "projectType": "library",
    "targets": {}
  }
}
```

- `root` tells Nx the location of the library including its sources and configuration files.
- `sourceRoot` tells Nx the location of the library's source files.
- `projectType` is either 'application' or 'library'. The project type is used in dep graph viz and in a few aux commands.
- `targets` configures all the targets which define what tasks you can run against the library.

> Projects utilizing `project.json` files are not present in `workspace.json`.

### Targets

Let's look at the simple target:

```json
{
  "test": {
    "executor": "@nrwl/jest:jest",
    "options": {
      "jestConfig": "libs/mylib/jest.config.js"
    }
  }
}
```

**Target Name**

The name of the target `test` means that you can invoke it as follows: `nx test mylib` or `nx run mylib:test`. The name isn't significant in any other way. If you rename it to, for example, `mytest`, you run as follows: `nx mytest mylib` or `nx run mylib:mytest`.

**Executor**

The `executor` property tells Nx what function to invoke when you run the target. `"@nrwl/jest:jest"` tells Nx to find the `@nrwl/jest` package, find the executor named `jest` and invoke it with the options.

**Options**

The `options` provides a map of values that are passed to the executor. The provided command line args are merged into this map. For example, `nx test mylib --jestConfig=libs/mylib/another-jest.config.js` passes the following to the executor:

```json
{
  "jestConfig": "libs/mylib/another-jest.config.js"
}
```

**Outputs**

The `outputs` property lists the folders the executor creates files in. The property is optional. If not provided, Nx assumes it is `dist/libs/mylib`.

```json
{
  "build": {
    "executor": "@nrwl/node:package",
    "options": {
      "outputPath": "dist/libs/mylib",
      "tsConfig": "libs/mylib/tsconfig.lib.json",
      "packageJson": "libs/mylib/package.json",
      "main": "libs/mylib/src/index.ts",
      "assets": ["libs/mylib/*.md"]
    }
  }
}
```

**Configurations**

The `configurations` property provides extra sets of values that are merged into the options map.

```json
{
  "build": {
    "executor": "@nrwl/node:package",
    "options": {
      "outputPath": "dist/libs/mylib",
      "tsConfig": "libs/mylib/tsconfig.lib.json",
      "packageJson": "libs/mylib/package.json",
      "main": "libs/mylib/src/index.ts",
      "assets": ["libs/mylib/*.md"]
    }
  },
  "configurations": {
    "production": {
      "packageJson": "libs/mylib/package.prod.json"
    }
  }
}
```

You can select a configuration like this: `nx build mylib --configuration=production` or `nx run mylib:build:configuration=production`.

The following show how the executor options get constructed:

```bash
require(`@nrwl/jest`).executors['jest']({...options, ...selectedConfiguration, ...commandLineArgs}}) // Pseudocode
```

The selected configuration adds/overrides the default options, and the provided command line args add/override the configuration options.

**Target Dependencies**

Targets can depend on other targets. A common scenario is having to build dependencies of a project first before building the project. You can specify this using the `dependsOn`.

```json
{
  "build": {
    "executor": "@nrwl/node:build",
    "outputs": ["dist/apps/myapp"],
    "options": {
      "index": "apps/myapp/src/app.html",
      "main": "apps/myapp/src/main.ts"
    },
    "dependsOn": [
      {
        "target": "build",
        "projects": "dependencies"
      }
    ]
  }
}
```

In this case, running `nx build myapp` builds all the buildable libraries `myapp` depends on first. In other words, `nx build myapp` results in multiple tasks executing. The `--parallel`, and `--max-parallel` flags have the same effect as they would with `run-many` or `affected`.

It is also possible to define dependencies between the targets of the same project.

In the following example invoking `nx build myapp` builds all the libraries first, then `nx build-base myapp` is executed and only then `nx build myapp` is executed.

```json
{
  "build-base": {
    "executor": "@nrwl/node:build",
    "outputs": ["dist/apps/myapp"],
    "options": {
      "index": "apps/myapp/src/app.html",
      "main": "apps/myapp/src/main.ts"
    }
  },
  "build": {
    "executor": "@nrwl/workspace:run-commands",
    "dependsOn": [
      {
        "target": "build",
        "projects": "dependencies"
      },
      {
        "target": "build-base",
        "projects": "self"
      }
    ],
    "options": {
      "command": "./copy-readme-and-license.sh"
    }
  }
}
```

Often the same `dependsOn` configuration has to be defined for every project in the repo. You can define it once in `nx.json` (see below).

### Generators

Default generator options are configured in `workspace.json` as well. For instance, the following tells Nx to always pass `--js` when creating new libraries.

```json
{
  "generators": {
    "@nrwl/node:library": {
      "buildable": true
    }
  }
}
```

You can also do it on the project level:

```json
{
  "mylib": {
    "root": "libs/mylib/",
    "sourceRoot": "libs/mylib/src",
    "projectType": "library",
    "generators": {
      "@nrwl/node:lib": {
        "moreOptions": true
      }
    },
    "targets": {}
  }
}
```

### CLI Options

The following command generates a new library: `nx g @nrwl/node:lib mylib`. After setting the `defaultCollection` property, the lib is generated without mentioning the collection name: `nx g lib mylib`.

```json
{
  "cli": {
    "defaultCollection": "@nrwl/node"
  }
}
```

### Version

When the `version` of `workspace.json` is set to 2, `targets`, `generators` and `executor` properties are used instead of the version 1 properties `architect`, `schematics` and `builder`.

## project.json

Project configurations can also be independent files, referenced by `workspace.json`. For instance, a `workspace.json` may contain projects configured as below.

```json
{
  "projects": {
    "mylib": "libs/mylib"
  }
}
```

This tells Nx that all configuration for that project is found in the `libs/mylib/project.json` file. This file contains a combination of the project's configuration from both `workspace.json` and `nx.json`.

```json
{
  "root": "libs/mylib/",
  "sourceRoot": "libs/mylib/src",
  "projectType": "library",
  "targets": {},
  "tags": [],
  "implicitDependencies": []
}
```

## nx.json

The `nx.json` file contains extra configuration options mostly related to the project graph.

```json
{
  "npmScope": "happyorg",
  "affected": {
    "defaultBase": "master"
  },
  "tasksRunnerOptions": {
    "default": {
      "runner": "@nrwl/workspace/tasks-runners/default",
      "options": {
        "cacheableOperations": ["build", "lint", "test", "e2e"]
      }
    }
  },
  "implicitDependencies": {
    "workspace.json": "*",
    "package.json": {
      "dependencies": "*",
      "devDependencies": "*"
    },
    "tsconfig.base.json": "*",
    "nx.json": "*"
  },
  "projects": {
    "myapp": {
      "tags": []
    },
    "mylib": {
      "tags": []
    },
    "myapp-e2e": {
      "tags": [],
      "implicitDependencies": ["myapp"]
    }
  }
}
```

**NPM Scope**

Tells Nx what prefix to use when generating library imports.

**Affected**

Tells Nx which branch and HEAD to use when calculating affected projects.

- `defaultBase` defines the default base branch, defaulted to `master`.

### Tasks Runner Options

Tasks runners are invoked when you run `nx test`, `nx build`, `nx run-many`, `nx affected`, and so on. The tasks runner named "default" is used by default. Specify a different one by passing `--runner`.

> A task is an invocation of a target.

Tasks runners can accept different options. The following are the options supported by `"@nrwl/workspace/tasks-runners/default"` and `"@nrwl/nx-cloud"`.

- `cacheableOperations` defines the list of targets/operations that are cached by Nx.
- `parallel` defines whether to run targets in parallel
- `maxParallel` defines the max number of processes used.
- `captureStderr` defines whether the cache captures stderr or just stdout
- `skipNxCache` defines whether the Nx Cache should be skipped. Defaults to `false`
- `cacheDirectory` defines where the local cache is stored, which is `node_modules/.cache/nx` by default.
- `encryptionKey` (when using `"@nrwl/nx-cloud"` only) defines an encryption key to support end-to-end encryption of your cloud cache. You may also provide an environment variable with the key `NX_CLOUD_ENCRYPTION_KEY` that contains an encryption key as its value. The Nx Cloud task runner normalizes the key length, so any length of key is acceptable.
- `runtimeCacheInputs` defines the list of commands that are run by the runner to include into the computation hash value.
- `selectivelyHashTsConfig` only hash the path mapping of the active project in the `tsconfig.base.json` (e.g., adding/removing projects doesn't affect the hash of existing projects). Defaults to `false`

`runtimeCacheInputs` are set as follows:

```json
{
  "tasksRunnerOptions": {
    "default": {
      "runner": "@nrwl/workspace/tasks-runners/default",
      "options": {
        "cacheableOperations": ["build", "lint", "test", "e2e"],
        "runtimeCacheInputs": ["node -v"]
      }
    }
  }
}
```

You can configure `parallel` and `maxParallel` in `nx.json`, but you can also pass them in the terminal `nx run-many --target=test --parallel`.

### Implicit Dependencies

Nx performs advanced source-code analysis to figure out the project graph of the workspace. So when you make a change, Nx can deduce what can be broken by this change. Some dependencies between projects and dependencies between shared files and projects cannot be inferred statically. You can configure those using `implicitDependencies`.

```json
{
  "implicitDependencies": {
    "workspace.json": "*",
    "package.json": {
      "dependencies": "*",
      "devDependencies": {
        "mypackage": ["mylib"]
      },
      "scripts": {
        "check:*": "*"
      }
    },
    "globalFile": ["myapp"],
    "styles/**/*.css": ["myapp"]
  }
}
```

In the example above:

- Changing `workspace.json` affects every project.
- Changing the `dependencies` property in `package.json` affects every project.
- Changing the `devDependencies` property in `package.json` only affects `mylib`.
- Changing any of the custom check `scripts` in `package.json` affects every project.
- Changing `globalFile` only affects `myapp`.
- Changing any CSS file inside the `styles` directory only affects `myapp`.

You can also add dependencies between projects. For instance, the example below defines a dependency from `myapp-e2e` to `myapp`, such that every time `myapp` is affected, `myapp-e2e` is affected as well.

```json
{
  "projects": {
    "myapp": {
      "tags": []
    },
    "myapp-e2e": {
      "tags": [],
      "implicitDependencies": ["myapp"]
    }
  }
}
```

> Projects utilizing `project.json` files are not present in `nx.json`.

### Target Dependencies

Targets can depend on other targets. A common scenario is having to build dependencies of a project first before building the project. The `dependsOn` property in `workspace.json` can be used to define the list of dependencies of an individual target.

Often the same `dependsOn` configuration has to be defined for every project in the repo, and that's when defining `targetDependencies` in `nx.json` is helpful.

```json
{
  "targetDependencies": {
    "build": [
      {
        "target": "build",
        "projects": "dependencies"
      }
    ]
  }
}
```

The configuration above is identical to adding `{"dependsOn": [{"target": "build", "projects": "dependencies"]}` to every build target in `workspace.json`.

The `dependsOn` property in `workspace.json` takes precedence over the `targetDependencies` in `nx.json`.

## .nxignore

You may optionally add an `.nxignore` file to the root. This file is used to specify files in your workspace that should be completely ignored by Nx.

The syntax is the same as a [`.gitignore` file](https://git-scm.com/book/en/v2/Git-Basics-Recording-Changes-to-the-Repository#_ignoring).

**When a file is specified in the `.nxignore` file:**

1. Changes to that file are not taken into account in the `affected` calculations.
2. Even if the file is outside an app or library, `nx workspace-lint` won't warn about it.

## Keeping the configuration in sync

When creating projects, the Nx generators make sure these configuration files are updated accordingly for the new projects. While development continues and the workspace grows, you might need to refactor projects by renaming them, moving them to a different folder, removing them, etc. When this is done manually, you need to ensure your configuration files are kept in sync and that's a cumbersome task. Fortunately, Nx provides some generators and executors to help you with these tasks.

### Moving projects

Projects can be moved or renamed using the [@nrwl/workspace:move](/{{framework}}/workspace/move) generator.

For instance, if a library under the booking folder is now being shared by multiple apps, you can move it to the shared folder like this:

```bash
nx g @nrwl/workspace:move --project booking-some-library shared/some-library
```

### Removing projects

Projects can be removed using the [@nrwl/workspace:remove](/{{framework}}/workspace/remove) generator.

```bash
nx g @nrwl/workspace:remove booking-some-library
```

### Validating the configuration

If at any point in time you want to check if your configuration is in sync, you can use the [workspace-lint]({{framework}}/cli/workspace-lint) executor:

```bash
nx workspace-lint
```

This will identify any projects with no files in the configured project root folder, as well as any file that's not part of any project configured in the workspace.
