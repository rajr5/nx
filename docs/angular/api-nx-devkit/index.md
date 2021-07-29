# Module: index

## Table of contents

### Enumerations

- [ChangeType](../../angular/nx-devkit/index#changetype)
- [DependencyType](../../angular/nx-devkit/index#dependencytype)

### Classes

- [ProjectGraphBuilder](../../angular/nx-devkit/index#projectgraphbuilder)

### Interfaces

- [ExecutorContext](../../angular/nx-devkit/index#executorcontext)
- [FileChange](../../angular/nx-devkit/index#filechange)
- [FileData](../../angular/nx-devkit/index#filedata)
- [ImplicitJsonSubsetDependency](../../angular/nx-devkit/index#implicitjsonsubsetdependency)
- [JsonParseOptions](../../angular/nx-devkit/index#jsonparseoptions)
- [JsonSerializeOptions](../../angular/nx-devkit/index#jsonserializeoptions)
- [NxAffectedConfig](../../angular/nx-devkit/index#nxaffectedconfig)
- [NxJsonConfiguration](../../angular/nx-devkit/index#nxjsonconfiguration)
- [NxJsonProjectConfiguration](../../angular/nx-devkit/index#nxjsonprojectconfiguration)
- [NxPlugin](../../angular/nx-devkit/index#nxplugin)
- [ProjectConfiguration](../../angular/nx-devkit/index#projectconfiguration)
- [ProjectFileMap](../../angular/nx-devkit/index#projectfilemap)
- [ProjectGraph](../../angular/nx-devkit/index#projectgraph)
- [ProjectGraphDependency](../../angular/nx-devkit/index#projectgraphdependency)
- [ProjectGraphNode](../../angular/nx-devkit/index#projectgraphnode)
- [ProjectGraphProcessorContext](../../angular/nx-devkit/index#projectgraphprocessorcontext)
- [StringDeletion](../../angular/nx-devkit/index#stringdeletion)
- [StringInsertion](../../angular/nx-devkit/index#stringinsertion)
- [Target](../../angular/nx-devkit/index#target)
- [TargetConfiguration](../../angular/nx-devkit/index#targetconfiguration)
- [TargetDependencyConfig](../../angular/nx-devkit/index#targetdependencyconfig)
- [Task](../../angular/nx-devkit/index#task)
- [TaskGraph](../../angular/nx-devkit/index#taskgraph)
- [Tree](../../angular/nx-devkit/index#tree)
- [Workspace](../../angular/nx-devkit/index#workspace)
- [WorkspaceJsonConfiguration](../../angular/nx-devkit/index#workspacejsonconfiguration)

### Type aliases

- [Executor](../../angular/nx-devkit/index#executor)
- [Generator](../../angular/nx-devkit/index#generator)
- [GeneratorCallback](../../angular/nx-devkit/index#generatorcallback)
- [ImplicitDependencyEntry](../../angular/nx-devkit/index#implicitdependencyentry)
- [PackageManager](../../angular/nx-devkit/index#packagemanager)
- [ProjectType](../../angular/nx-devkit/index#projecttype)
- [StringChange](../../angular/nx-devkit/index#stringchange)
- [TaskGraphExecutor](../../angular/nx-devkit/index#taskgraphexecutor)
- [WorkspaceConfiguration](../../angular/nx-devkit/index#workspaceconfiguration)

### Variables

- [logger](../../angular/nx-devkit/index#logger)

### Functions

- [addDependenciesToPackageJson](../../angular/nx-devkit/index#adddependenciestopackagejson)
- [addProjectConfiguration](../../angular/nx-devkit/index#addprojectconfiguration)
- [applyChangesToString](../../angular/nx-devkit/index#applychangestostring)
- [convertNxExecutor](../../angular/nx-devkit/index#convertnxexecutor)
- [convertNxGenerator](../../angular/nx-devkit/index#convertnxgenerator)
- [detectPackageManager](../../angular/nx-devkit/index#detectpackagemanager)
- [formatFiles](../../angular/nx-devkit/index#formatfiles)
- [generateFiles](../../angular/nx-devkit/index#generatefiles)
- [getPackageManagerCommand](../../angular/nx-devkit/index#getpackagemanagercommand)
- [getPackageManagerVersion](../../angular/nx-devkit/index#getpackagemanagerversion)
- [getProjects](../../angular/nx-devkit/index#getprojects)
- [getWorkspaceLayout](../../angular/nx-devkit/index#getworkspacelayout)
- [getWorkspacePath](../../angular/nx-devkit/index#getworkspacepath)
- [installPackagesTask](../../angular/nx-devkit/index#installpackagestask)
- [isStandaloneProject](../../angular/nx-devkit/index#isstandaloneproject)
- [joinPathFragments](../../angular/nx-devkit/index#joinpathfragments)
- [moveFilesToNewDirectory](../../angular/nx-devkit/index#movefilestonewdirectory)
- [names](../../angular/nx-devkit/index#names)
- [normalizePath](../../angular/nx-devkit/index#normalizepath)
- [offsetFromRoot](../../angular/nx-devkit/index#offsetfromroot)
- [parseJson](../../angular/nx-devkit/index#parsejson)
- [parseTargetString](../../angular/nx-devkit/index#parsetargetstring)
- [readJson](../../angular/nx-devkit/index#readjson)
- [readJsonFile](../../angular/nx-devkit/index#readjsonfile)
- [readProjectConfiguration](../../angular/nx-devkit/index#readprojectconfiguration)
- [readTargetOptions](../../angular/nx-devkit/index#readtargetoptions)
- [readWorkspaceConfiguration](../../angular/nx-devkit/index#readworkspaceconfiguration)
- [removeDependenciesFromPackageJson](../../angular/nx-devkit/index#removedependenciesfrompackagejson)
- [removeProjectConfiguration](../../angular/nx-devkit/index#removeprojectconfiguration)
- [runExecutor](../../angular/nx-devkit/index#runexecutor)
- [serializeJson](../../angular/nx-devkit/index#serializejson)
- [stripIndents](../../angular/nx-devkit/index#stripindents)
- [stripJsonComments](../../angular/nx-devkit/index#stripjsoncomments)
- [targetToTargetString](../../angular/nx-devkit/index#targettotargetstring)
- [toJS](../../angular/nx-devkit/index#tojs)
- [updateJson](../../angular/nx-devkit/index#updatejson)
- [updateProjectConfiguration](../../angular/nx-devkit/index#updateprojectconfiguration)
- [updateTsConfigsToJs](../../angular/nx-devkit/index#updatetsconfigstojs)
- [updateWorkspaceConfiguration](../../angular/nx-devkit/index#updateworkspaceconfiguration)
- [visitNotIgnoredFiles](../../angular/nx-devkit/index#visitnotignoredfiles)
- [writeJson](../../angular/nx-devkit/index#writejson)
- [writeJsonFile](../../angular/nx-devkit/index#writejsonfile)

## Enumerations

### ChangeType

• **ChangeType**: `Object`

---

### DependencyType

• **DependencyType**: `Object`

Type of dependency between projects

## Classes

### ProjectGraphBuilder

• **ProjectGraphBuilder**: `Object`

Builder for adding nodes and dependencies to a [ProjectGraph](../../angular/nx-devkit/index#projectgraph)

## Interfaces

### ExecutorContext

• **ExecutorContext**: `Object`

Context that is passed into an executor

---

### FileChange

• **FileChange**: `Object`

Description of a file change in the Nx virtual file system/

---

### FileData

• **FileData**: `Object`

Some metadata about a file

---

### ImplicitJsonSubsetDependency

• **ImplicitJsonSubsetDependency**<`T`\>: `Object`

#### Type parameters

| Name | Type                |
| :--- | :------------------ |
| `T`  | `"*"` \| `string`[] |

---

### JsonParseOptions

• **JsonParseOptions**: `Object`

---

### JsonSerializeOptions

• **JsonSerializeOptions**: `Object`

---

### NxAffectedConfig

• **NxAffectedConfig**: `Object`

---

### NxJsonConfiguration

• **NxJsonConfiguration**<`T`\>: `Object`

Nx.json configuration

#### Type parameters

| Name | Type                |
| :--- | :------------------ |
| `T`  | `"*"` \| `string`[] |

---

### NxJsonProjectConfiguration

• **NxJsonProjectConfiguration**: `Object`

---

### NxPlugin

• **NxPlugin**: `Object`

A plugin for Nx

---

### ProjectConfiguration

• **ProjectConfiguration**: `Object`

Project configuration

---

### ProjectFileMap

• **ProjectFileMap**: `Object`

A list of files separated by the project they belong to

---

### ProjectGraph

• **ProjectGraph**<`T`\>: `Object`

A Graph of projects in the workspace and dependencies between them

#### Type parameters

| Name | Type  |
| :--- | :---- |
| `T`  | `any` |

---

### ProjectGraphDependency

• **ProjectGraphDependency**: `Object`

A dependency between two projects

---

### ProjectGraphNode

• **ProjectGraphNode**<`T`\>: `Object`

A node describing a project in a workspace

#### Type parameters

| Name | Type  |
| :--- | :---- |
| `T`  | `any` |

---

### ProjectGraphProcessorContext

• **ProjectGraphProcessorContext**: `Object`

Additional information to be used to process a project graph

---

### StringDeletion

• **StringDeletion**: `Object`

---

### StringInsertion

• **StringInsertion**: `Object`

---

### Target

• **Target**: `Object`

---

### TargetConfiguration

• **TargetConfiguration**: `Object`

Target's configuration

---

### TargetDependencyConfig

• **TargetDependencyConfig**: `Object`

---

### Task

• **Task**: `Object`

A representation of the invocation of an Executor

---

### TaskGraph

• **TaskGraph**: `Object`

Graph of Tasks to be executed

---

### Tree

• **Tree**: `Object`

Virtual file system tree.

---

### Workspace

• **Workspace**: `Object`

---

### WorkspaceJsonConfiguration

• **WorkspaceJsonConfiguration**: `Object`

Workspace configuration

## Type aliases

### Executor

Ƭ **Executor**<`T`\>: (`options`: `T`, `context`: [`ExecutorContext`](../../angular/nx-devkit/index#executorcontext)) => `Promise`<`Object`\> \| `AsyncIterableIterator`<`Object`\>

#### Type parameters

| Name | Type  |
| :--- | :---- |
| `T`  | `any` |

#### Type declaration

▸ (`options`, `context`): `Promise`<`Object`\> \| `AsyncIterableIterator`<`Object`\>

Implementation of a target of a project

##### Parameters

| Name      | Type                                                               |
| :-------- | :----------------------------------------------------------------- |
| `options` | `T`                                                                |
| `context` | [`ExecutorContext`](../../angular/nx-devkit/index#executorcontext) |

##### Returns

`Promise`<`Object`\> \| `AsyncIterableIterator`<`Object`\>

---

### Generator

Ƭ **Generator**<`T`\>: (`tree`: `any`, `schema`: `T`) => `void` \| [`GeneratorCallback`](../../angular/nx-devkit/index#generatorcallback) \| `Promise`<`void` \| [`GeneratorCallback`](../../angular/nx-devkit/index#generatorcallback)\>

#### Type parameters

| Name | Type      |
| :--- | :-------- |
| `T`  | `unknown` |

#### Type declaration

▸ (`tree`, `schema`): `void` \| [`GeneratorCallback`](../../angular/nx-devkit/index#generatorcallback) \| `Promise`<`void` \| [`GeneratorCallback`](../../angular/nx-devkit/index#generatorcallback)\>

A function that schedules updates to the filesystem to be done atomically

##### Parameters

| Name     | Type  |
| :------- | :---- |
| `tree`   | `any` |
| `schema` | `T`   |

##### Returns

`void` \| [`GeneratorCallback`](../../angular/nx-devkit/index#generatorcallback) \| `Promise`<`void` \| [`GeneratorCallback`](../../angular/nx-devkit/index#generatorcallback)\>

---

### GeneratorCallback

Ƭ **GeneratorCallback**: () => `void` \| `Promise`<`void`\>

#### Type declaration

▸ (): `void` \| `Promise`<`void`\>

A callback function that is executed after changes are made to the file system

##### Returns

`void` \| `Promise`<`void`\>

---

### ImplicitDependencyEntry

Ƭ **ImplicitDependencyEntry**<`T`\>: `Object`

#### Type parameters

| Name | Type                |
| :--- | :------------------ |
| `T`  | `"*"` \| `string`[] |

#### Index signature

▪ [key: `string`]: `T` \| [`ImplicitJsonSubsetDependency`](../../angular/nx-devkit/index#implicitjsonsubsetdependency)<`T`\>

---

### PackageManager

Ƭ **PackageManager**: `"yarn"` \| `"pnpm"` \| `"npm"`

---

### ProjectType

Ƭ **ProjectType**: `"library"` \| `"application"`

Type of project supported

---

### StringChange

Ƭ **StringChange**: [`StringInsertion`](../../angular/nx-devkit/index#stringinsertion) \| [`StringDeletion`](../../angular/nx-devkit/index#stringdeletion)

A change to be made to a string

---

### TaskGraphExecutor

Ƭ **TaskGraphExecutor**<`T`\>: (`taskGraph`: [`TaskGraph`](../../angular/nx-devkit/index#taskgraph), `options`: `Record`<`string`, `T`\>, `overrides`: `T`, `context`: [`ExecutorContext`](../../angular/nx-devkit/index#executorcontext)) => `Promise`<`Record`<`string`, `Object`\>\>

#### Type parameters

| Name | Type  |
| :--- | :---- |
| `T`  | `any` |

#### Type declaration

▸ (`taskGraph`, `options`, `overrides`, `context`): `Promise`<`Record`<`string`, `Object`\>\>

Implementation of a target of a project that handles multiple projects to be batched

##### Parameters

| Name        | Type                                                               |
| :---------- | :----------------------------------------------------------------- |
| `taskGraph` | [`TaskGraph`](../../angular/nx-devkit/index#taskgraph)             |
| `options`   | `Record`<`string`, `T`\>                                           |
| `overrides` | `T`                                                                |
| `context`   | [`ExecutorContext`](../../angular/nx-devkit/index#executorcontext) |

##### Returns

`Promise`<`Record`<`string`, `Object`\>\>

---

### WorkspaceConfiguration

Ƭ **WorkspaceConfiguration**: `Omit`<[`WorkspaceJsonConfiguration`](../../angular/nx-devkit/index#workspacejsonconfiguration), `"projects"`\> & `Omit`<[`NxJsonConfiguration`](../../angular/nx-devkit/index#nxjsonconfiguration), `"projects"`\>

## Variables

### logger

• `Const` **logger**: `Object`

#### Type declaration

| Name    | Type                        |
| :------ | :-------------------------- |
| `debug` | (...`s`: `any`[]) => `void` |
| `error` | (`s`: `any`) => `void`      |
| `fatal` | (...`s`: `any`[]) => `void` |
| `info`  | (`s`: `any`) => `void`      |
| `log`   | (...`s`: `any`[]) => `void` |
| `warn`  | (`s`: `any`) => `void`      |

## Functions

### addDependenciesToPackageJson

▸ **addDependenciesToPackageJson**(`tree`, `dependencies`, `devDependencies`, `packageJsonPath?`): [`GeneratorCallback`](../../angular/nx-devkit/index#generatorcallback)

Add Dependencies and Dev Dependencies to package.json

For example:

```typescript
addDependenciesToPackageJson(tree, { react: 'latest' }, { jest: 'latest' });
```

This will **add** `react` and `jest` to the dependencies and devDependencies sections of package.json respectively.

#### Parameters

| Name              | Type                                         | Default value    | Description                                                             |
| :---------------- | :------------------------------------------- | :--------------- | :---------------------------------------------------------------------- |
| `tree`            | [`Tree`](../../angular/nx-devkit/index#tree) | `undefined`      | Tree representing file system to modify                                 |
| `dependencies`    | `Record`<`string`, `string`\>                | `undefined`      | Dependencies to be added to the dependencies section of package.json    |
| `devDependencies` | `Record`<`string`, `string`\>                | `undefined`      | Dependencies to be added to the devDependencies section of package.json |
| `packageJsonPath` | `string`                                     | `'package.json'` | Path to package.json                                                    |

#### Returns

[`GeneratorCallback`](../../angular/nx-devkit/index#generatorcallback)

Callback to install dependencies only if necessary. undefined is returned if changes are not necessary.

---

### addProjectConfiguration

▸ **addProjectConfiguration**(`tree`, `projectName`, `projectConfiguration`, `standalone?`): `void`

Adds project configuration to the Nx workspace.

The project configuration is stored in workspace.json and nx.json. The utility will update
both files.

#### Parameters

| Name                   | Type                                                                                                                                                                    | Default value | Description                                                                                |
| :--------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------ | :----------------------------------------------------------------------------------------- |
| `tree`                 | [`Tree`](../../angular/nx-devkit/index#tree)                                                                                                                            | `undefined`   | the file system tree                                                                       |
| `projectName`          | `string`                                                                                                                                                                | `undefined`   | unique name. Often directories are part of the name (e.g., mydir-mylib)                    |
| `projectConfiguration` | [`ProjectConfiguration`](../../angular/nx-devkit/index#projectconfiguration) & [`NxJsonProjectConfiguration`](../../angular/nx-devkit/index#nxjsonprojectconfiguration) | `undefined`   | project configuration                                                                      |
| `standalone`           | `boolean`                                                                                                                                                               | `false`       | should the project use package.json? If false, the project config is inside workspace.json |

#### Returns

`void`

---

### applyChangesToString

▸ **applyChangesToString**(`text`, `changes`): `string`

Applies a list of changes to a string's original value.

This is useful when working with ASTs.

For Example, to rename a property in a method's options:

```typescript
const code = `bootstrap({
  target: document.querySelector('#app')
})`;

const indexOfPropertyName = 13; // Usually determined by analyzing an AST.
const updatedCode = applyChangesToString(code, [
  {
    type: ChangeType.Insert,
    index: indexOfPropertyName,
    text: 'element',
  },
  {
    type: ChangeType.Delete,
    start: indexOfPropertyName,
    length: 6,
  },
]);

bootstrap({
  element: document.querySelector('#app'),
});
```

#### Parameters

| Name      | Type                                                           |
| :-------- | :------------------------------------------------------------- |
| `text`    | `string`                                                       |
| `changes` | [`StringChange`](../../angular/nx-devkit/index#stringchange)[] |

#### Returns

`string`

---

### convertNxExecutor

▸ **convertNxExecutor**(`executor`): `any`

Convert an Nx Executor into an Angular Devkit Builder

Use this to expose a compatible Angular Builder

#### Parameters

| Name       | Type                                                 |
| :--------- | :--------------------------------------------------- |
| `executor` | [`Executor`](../../angular/nx-devkit/index#executor) |

#### Returns

`any`

---

### convertNxGenerator

▸ **convertNxGenerator**<`T`\>(`generator`): (`options`: `T`) => (`tree`: `any`, `context`: `any`) => `Promise`<`any`\>

Convert an Nx Generator into an Angular Devkit Schematic

#### Type parameters

| Name | Type  |
| :--- | :---- |
| `T`  | `any` |

#### Parameters

| Name        | Type                                                         |
| :---------- | :----------------------------------------------------------- |
| `generator` | [`Generator`](../../angular/nx-devkit/index#generator)<`T`\> |

#### Returns

`fn`

▸ (`options`): (`tree`: `any`, `context`: `any`) => `Promise`<`any`\>

##### Parameters

| Name      | Type |
| :-------- | :--- |
| `options` | `T`  |

##### Returns

`fn`

▸ (`tree`, `context`): `Promise`<`any`\>

##### Parameters

| Name      | Type  |
| :-------- | :---- |
| `tree`    | `any` |
| `context` | `any` |

##### Returns

`Promise`<`any`\>

---

### detectPackageManager

▸ **detectPackageManager**(`dir?`): [`PackageManager`](../../angular/nx-devkit/index#packagemanager)

Detects which package manager is used in the workspace based on the lock file.

#### Parameters

| Name  | Type     | Default value |
| :---- | :------- | :------------ |
| `dir` | `string` | `''`          |

#### Returns

[`PackageManager`](../../angular/nx-devkit/index#packagemanager)

---

### formatFiles

▸ **formatFiles**(`tree`): `Promise`<`void`\>

Formats all the created or updated files using Prettier

#### Parameters

| Name   | Type                                         | Description          |
| :----- | :------------------------------------------- | :------------------- |
| `tree` | [`Tree`](../../angular/nx-devkit/index#tree) | the file system tree |

#### Returns

`Promise`<`void`\>

---

### generateFiles

▸ **generateFiles**(`tree`, `srcFolder`, `target`, `substitutions`): `void`

Generates a folder of files based on provided templates.

While doing so it performs two substitutions:

- Substitutes segments of file names surrounded by \_\_
- Uses ejs to substitute values in templates

Examples:

```typescript
generateFiles(tree, path.join(__dirname, 'files'), './tools/scripts', {
  tmpl: '',
  name: 'myscript',
});
```

This command will take all the files from the `files` directory next to the place where the command is invoked from.
It will replace all `__tmpl__` with '' and all `__name__` with 'myscript' in the file names, and will replace all
`<%= name %>` with `myscript` in the files themselves.
`tmpl: ''` is a common pattern. With it you can name files like this: `index.ts__tmpl__`, so your editor
doesn't get confused about incorrect TypeScript files.

#### Parameters

| Name            | Type                                         | Description                                   |
| :-------------- | :------------------------------------------- | :-------------------------------------------- |
| `tree`          | [`Tree`](../../angular/nx-devkit/index#tree) | the file system tree                          |
| `srcFolder`     | `string`                                     | the source folder of files (absolute path)    |
| `target`        | `string`                                     | the target folder (relative to the tree root) |
| `substitutions` | `Object`                                     | an object of key-value pairs                  |

#### Returns

`void`

---

### getPackageManagerCommand

▸ **getPackageManagerCommand**(`packageManager?`): `PackageManagerCommands`

Returns commands for the package manager used in the workspace.
By default, the package manager is derived based on the lock file,
but it can also be passed in explicitly.

Example:

```javascript
execSync(`${getPackageManagerCommand().addDev} my-dev-package`);
```

#### Parameters

| Name             | Type                                                             |
| :--------------- | :--------------------------------------------------------------- |
| `packageManager` | [`PackageManager`](../../angular/nx-devkit/index#packagemanager) |

#### Returns

`PackageManagerCommands`

---

### getPackageManagerVersion

▸ **getPackageManagerVersion**(`packageManager?`): `string`

Returns the version of the package manager used in the workspace.
By default, the package manager is derived based on the lock file,
but it can also be passed in explicitly.

#### Parameters

| Name             | Type                                                             |
| :--------------- | :--------------------------------------------------------------- |
| `packageManager` | [`PackageManager`](../../angular/nx-devkit/index#packagemanager) |

#### Returns

`string`

---

### getProjects

▸ **getProjects**(`tree`): `Map`<`string`, [`ProjectConfiguration`](../../angular/nx-devkit/index#projectconfiguration) & [`NxJsonProjectConfiguration`](../../angular/nx-devkit/index#nxjsonprojectconfiguration)\>

Get a map of all projects in a workspace.

Use [readProjectConfiguration](../../angular/nx-devkit/index#readprojectconfiguration) if only one project is needed.

#### Parameters

| Name   | Type                                         |
| :----- | :------------------------------------------- |
| `tree` | [`Tree`](../../angular/nx-devkit/index#tree) |

#### Returns

`Map`<`string`, [`ProjectConfiguration`](../../angular/nx-devkit/index#projectconfiguration) & [`NxJsonProjectConfiguration`](../../angular/nx-devkit/index#nxjsonprojectconfiguration)\>

---

### getWorkspaceLayout

▸ **getWorkspaceLayout**(`tree`): `Object`

Returns workspace defaults. It includes defaults folders for apps and libs,
and the default scope.

Example:

```typescript
{ appsDir: 'apps', libsDir: 'libs', npmScope: 'myorg' }
```

#### Parameters

| Name   | Type                                         | Description      |
| :----- | :------------------------------------------- | :--------------- |
| `tree` | [`Tree`](../../angular/nx-devkit/index#tree) | file system tree |

#### Returns

`Object`

| Name                  | Type      |
| :-------------------- | :-------- |
| `appsDir`             | `string`  |
| `libsDir`             | `string`  |
| `npmScope`            | `string`  |
| `standaloneAsDefault` | `boolean` |

---

### getWorkspacePath

▸ **getWorkspacePath**(`tree`): `string`

#### Parameters

| Name   | Type                                         |
| :----- | :------------------------------------------- |
| `tree` | [`Tree`](../../angular/nx-devkit/index#tree) |

#### Returns

`string`

---

### installPackagesTask

▸ **installPackagesTask**(`tree`, `alwaysRun?`, `cwd?`, `packageManager?`): `void`

Runs `npm install` or `yarn install`. It will skip running the install if
`package.json` hasn't changed at all or it hasn't changed since the last invocation.

#### Parameters

| Name             | Type                                                             | Default value | Description                                                   |
| :--------------- | :--------------------------------------------------------------- | :------------ | :------------------------------------------------------------ |
| `tree`           | [`Tree`](../../angular/nx-devkit/index#tree)                     | `undefined`   | the file system tree                                          |
| `alwaysRun`      | `boolean`                                                        | `false`       | always run the command even if `package.json` hasn't changed. |
| `cwd`            | `string`                                                         | `''`          | -                                                             |
| `packageManager` | [`PackageManager`](../../angular/nx-devkit/index#packagemanager) | `undefined`   | -                                                             |

#### Returns

`void`

---

### isStandaloneProject

▸ **isStandaloneProject**(`tree`, `project`): `boolean`

Returns if a project has a standalone configuration (project.json).

#### Parameters

| Name      | Type                                         | Description          |
| :-------- | :------------------------------------------- | :------------------- |
| `tree`    | [`Tree`](../../angular/nx-devkit/index#tree) | the file system tree |
| `project` | `string`                                     | the project name     |

#### Returns

`boolean`

---

### joinPathFragments

▸ **joinPathFragments**(...`fragments`): `string`

Normalized path fragments and joins them

#### Parameters

| Name           | Type       |
| :------------- | :--------- |
| `...fragments` | `string`[] |

#### Returns

`string`

---

### moveFilesToNewDirectory

▸ **moveFilesToNewDirectory**(`tree`, `oldDir`, `newDir`): `void`

#### Parameters

| Name     | Type                                         |
| :------- | :------------------------------------------- |
| `tree`   | [`Tree`](../../angular/nx-devkit/index#tree) |
| `oldDir` | `string`                                     |
| `newDir` | `string`                                     |

#### Returns

`void`

---

### names

▸ **names**(`name`): `Object`

Util function to generate different strings based off the provided name.

Examples:

```typescript
names('my-name'); // {name: 'my-name', className: 'MyName', propertyName: 'myName', constantName: 'MY_NAME', fileName: 'my-name'}
names('myName'); // {name: 'my-name', className: 'MyName', propertyName: 'myName', constantName: 'MY_NAME', fileName: 'my-name'}
```

#### Parameters

| Name   | Type     |
| :----- | :------- |
| `name` | `string` |

#### Returns

`Object`

| Name           | Type     |
| :------------- | :------- |
| `className`    | `string` |
| `constantName` | `string` |
| `fileName`     | `string` |
| `name`         | `string` |
| `propertyName` | `string` |

---

### normalizePath

▸ **normalizePath**(`osSpecificPath`): `string`

Coverts an os specific path to a unix style path

#### Parameters

| Name             | Type     |
| :--------------- | :------- |
| `osSpecificPath` | `string` |

#### Returns

`string`

---

### offsetFromRoot

▸ **offsetFromRoot**(`fullPathToDir`): `string`

Calculates an offset from the root of the workspace, which is useful for
constructing relative URLs.

Examples:

```typescript
offsetFromRoot('apps/mydir/myapp/'); // returns "../../../"
```

#### Parameters

| Name            | Type     | Description    |
| :-------------- | :------- | :------------- |
| `fullPathToDir` | `string` | directory path |

#### Returns

`string`

---

### parseJson

▸ **parseJson**<`T`\>(`input`, `options?`): `T`

Parses the given JSON string and returns the object the JSON content represents.
By default javascript-style comments are allowed.

#### Type parameters

| Name | Type                    |
| :--- | :---------------------- |
| `T`  | extends ` object``any ` |

#### Parameters

| Name       | Type                                                                 | Description            |
| :--------- | :------------------------------------------------------------------- | :--------------------- |
| `input`    | `string`                                                             | JSON content as string |
| `options?` | [`JsonParseOptions`](../../angular/nx-devkit/index#jsonparseoptions) | JSON parse options     |

#### Returns

`T`

Object the JSON content represents

---

### parseTargetString

▸ **parseTargetString**(`targetString`): [`Target`](../../angular/nx-devkit/index#target)

Parses a target string into {project, target, configuration}

Examples:

```typescript
parseTargetString('proj:test'); // returns { project: "proj", target: "test" }
parseTargetString('proj:test:production'); // returns { project: "proj", target: "test", configuration: "production" }
```

#### Parameters

| Name           | Type     | Description      |
| :------------- | :------- | :--------------- |
| `targetString` | `string` | target reference |

#### Returns

[`Target`](../../angular/nx-devkit/index#target)

---

### readJson

▸ **readJson**<`T`\>(`tree`, `path`, `options?`): `T`

Reads a json file, removes all comments and parses JSON.

#### Type parameters

| Name | Type                    |
| :--- | :---------------------- |
| `T`  | extends ` object``any ` |

#### Parameters

| Name       | Type                                                                 | Description                 |
| :--------- | :------------------------------------------------------------------- | :-------------------------- |
| `tree`     | [`Tree`](../../angular/nx-devkit/index#tree)                         | file system tree            |
| `path`     | `string`                                                             | file path                   |
| `options?` | [`JsonParseOptions`](../../angular/nx-devkit/index#jsonparseoptions) | Optional JSON Parse Options |

#### Returns

`T`

---

### readJsonFile

▸ **readJsonFile**<`T`\>(`path`, `options?`): `T`

Reads a JSON file and returns the object the JSON content represents.

#### Type parameters

| Name | Type                    |
| :--- | :---------------------- |
| `T`  | extends ` object``any ` |

#### Parameters

| Name       | Type              | Description        |
| :--------- | :---------------- | :----------------- |
| `path`     | `string`          | A path to a file.  |
| `options?` | `JsonReadOptions` | JSON parse options |

#### Returns

`T`

Object the JSON content of the file represents

---

### readProjectConfiguration

▸ **readProjectConfiguration**(`tree`, `projectName`): [`ProjectConfiguration`](../../angular/nx-devkit/index#projectconfiguration) & [`NxJsonProjectConfiguration`](../../angular/nx-devkit/index#nxjsonprojectconfiguration)

Reads a project configuration.

The project configuration is stored in workspace.json and nx.json. The utility will read
both files.

**`throws`** If supplied projectName cannot be found

#### Parameters

| Name          | Type                                         | Description                                                             |
| :------------ | :------------------------------------------- | :---------------------------------------------------------------------- |
| `tree`        | [`Tree`](../../angular/nx-devkit/index#tree) | the file system tree                                                    |
| `projectName` | `string`                                     | unique name. Often directories are part of the name (e.g., mydir-mylib) |

#### Returns

[`ProjectConfiguration`](../../angular/nx-devkit/index#projectconfiguration) & [`NxJsonProjectConfiguration`](../../angular/nx-devkit/index#nxjsonprojectconfiguration)

---

### readTargetOptions

▸ **readTargetOptions**<`T`\>(`__namedParameters`, `context`): `T`

Reads and combines options for a given target.

Works as if you invoked the target yourself without passing any command lint overrides.

#### Type parameters

| Name | Type  |
| :--- | :---- |
| `T`  | `any` |

#### Parameters

| Name                | Type                                                               |
| :------------------ | :----------------------------------------------------------------- |
| `__namedParameters` | [`Target`](../../angular/nx-devkit/index#target)                   |
| `context`           | [`ExecutorContext`](../../angular/nx-devkit/index#executorcontext) |

#### Returns

`T`

---

### readWorkspaceConfiguration

▸ **readWorkspaceConfiguration**(`tree`): [`WorkspaceConfiguration`](../../angular/nx-devkit/index#workspaceconfiguration)

Read general workspace configuration such as the default project or cli settings

This does _not_ provide projects configuration, use [readProjectConfiguration](../../angular/nx-devkit/index#readprojectconfiguration) instead.

#### Parameters

| Name   | Type                                         |
| :----- | :------------------------------------------- |
| `tree` | [`Tree`](../../angular/nx-devkit/index#tree) |

#### Returns

[`WorkspaceConfiguration`](../../angular/nx-devkit/index#workspaceconfiguration)

---

### removeDependenciesFromPackageJson

▸ **removeDependenciesFromPackageJson**(`tree`, `dependencies`, `devDependencies`, `packageJsonPath?`): [`GeneratorCallback`](../../angular/nx-devkit/index#generatorcallback)

Remove Dependencies and Dev Dependencies from package.json

For example:

```typescript
removeDependenciesFromPackageJson(tree, ['react'], ['jest']);
```

This will **remove** `react` and `jest` from the dependencies and devDependencies sections of package.json respectively.

#### Parameters

| Name              | Type                                         | Default value    | Description                                                                 |
| :---------------- | :------------------------------------------- | :--------------- | :-------------------------------------------------------------------------- |
| `tree`            | [`Tree`](../../angular/nx-devkit/index#tree) | `undefined`      | -                                                                           |
| `dependencies`    | `string`[]                                   | `undefined`      | Dependencies to be removed from the dependencies section of package.json    |
| `devDependencies` | `string`[]                                   | `undefined`      | Dependencies to be removed from the devDependencies section of package.json |
| `packageJsonPath` | `string`                                     | `'package.json'` | -                                                                           |

#### Returns

[`GeneratorCallback`](../../angular/nx-devkit/index#generatorcallback)

Callback to uninstall dependencies only if necessary. undefined is returned if changes are not necessary.

---

### removeProjectConfiguration

▸ **removeProjectConfiguration**(`tree`, `projectName`): `void`

Removes the configuration of an existing project.

The project configuration is stored in workspace.json and nx.json.
The utility will update both files.

#### Parameters

| Name          | Type                                         |
| :------------ | :------------------------------------------- |
| `tree`        | [`Tree`](../../angular/nx-devkit/index#tree) |
| `projectName` | `string`                                     |

#### Returns

`void`

---

### runExecutor

▸ **runExecutor**<`T`\>(`targetDescription`, `options`, `context`): `Promise`<`AsyncIterableIterator`<`T`\>\>

Loads and invokes executor.

This is analogous to invoking executor from the terminal, with the exception
that the params aren't parsed from the string, but instead provided parsed already.

Apart from that, it works the same way:

- it will load the workspace configuration
- it will resolve the target
- it will load the executor and the schema
- it will load the options for the appropriate configuration
- it will run the validations and will set the default
- and, of course, it will invoke the executor

Example:

```typescript
for await (const s of await runExecutor(
  { project: 'myproj', target: 'serve' },
  { watch: true },
  context
)) {
  // s.success
}
```

Note that the return value is a promise of an iterator, so you need to await before iterating over it.

#### Type parameters

| Name | Type             |
| :--- | :--------------- |
| `T`  | extends `Object` |

#### Parameters

| Name                               | Type                                                               |
| :--------------------------------- | :----------------------------------------------------------------- |
| `targetDescription`                | `Object`                                                           |
| `targetDescription.configuration?` | `string`                                                           |
| `targetDescription.project`        | `string`                                                           |
| `targetDescription.target`         | `string`                                                           |
| `options`                          | `Object`                                                           |
| `context`                          | [`ExecutorContext`](../../angular/nx-devkit/index#executorcontext) |

#### Returns

`Promise`<`AsyncIterableIterator`<`T`\>\>

---

### serializeJson

▸ **serializeJson**<`T`\>(`input`, `options?`): `string`

Serializes the given data to a JSON string.
By default the JSON string is formatted with a 2 space intendation to be easy readable.

#### Type parameters

| Name | Type                       |
| :--- | :------------------------- |
| `T`  | extends ` object``object ` |

#### Parameters

| Name       | Type                                                                         | Description                               |
| :--------- | :--------------------------------------------------------------------------- | :---------------------------------------- |
| `input`    | `T`                                                                          | Object which should be serialized to JSON |
| `options?` | [`JsonSerializeOptions`](../../angular/nx-devkit/index#jsonserializeoptions) | JSON serialize options                    |

#### Returns

`string`

the formatted JSON representation of the object

---

### stripIndents

▸ **stripIndents**(`strings`, ...`values`): `string`

Removes indents, which is useful for printing warning and messages.

Example:

```typescript
stripIndents`
 Options:
 - option1
 - option2
`;
```

#### Parameters

| Name        | Type                   |
| :---------- | :--------------------- |
| `strings`   | `TemplateStringsArray` |
| `...values` | `any`[]                |

#### Returns

`string`

---

### stripJsonComments

▸ `Const` **stripJsonComments**(`text`, `replaceCh?`): `string`

Takes JSON with JavaScript-style comments and remove
them. Optionally replaces every none-newline character
of comments with a replaceCharacter

#### Parameters

| Name         | Type     |
| :----------- | :------- |
| `text`       | `string` |
| `replaceCh?` | `string` |

#### Returns

`string`

---

### targetToTargetString

▸ **targetToTargetString**(`__namedParameters`): `string`

Returns a string in the format "project:target[:configuration]" for the target

#### Parameters

| Name                | Type                                             |
| :------------------ | :----------------------------------------------- |
| `__namedParameters` | [`Target`](../../angular/nx-devkit/index#target) |

#### Returns

`string`

---

### toJS

▸ **toJS**(`tree`): `void`

Rename and transpile any new typescript files created to javascript files

#### Parameters

| Name   | Type                                         |
| :----- | :------------------------------------------- |
| `tree` | [`Tree`](../../angular/nx-devkit/index#tree) |

#### Returns

`void`

---

### updateJson

▸ **updateJson**<`T`, `U`\>(`tree`, `path`, `updater`, `options?`): `void`

Updates a JSON value to the file system tree

#### Type parameters

| Name | Type                    |
| :--- | :---------------------- |
| `T`  | extends ` object``any ` |
| `U`  | extends ` object``T `   |

#### Parameters

| Name       | Type                                                                                                                                                | Description                                                                                          |
| :--------- | :-------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------- |
| `tree`     | [`Tree`](../../angular/nx-devkit/index#tree)                                                                                                        | File system tree                                                                                     |
| `path`     | `string`                                                                                                                                            | Path of JSON file in the Tree                                                                        |
| `updater`  | (`value`: `T`) => `U`                                                                                                                               | Function that maps the current value of a JSON document to a new value to be written to the document |
| `options?` | [`JsonParseOptions`](../../angular/nx-devkit/index#jsonparseoptions) & [`JsonSerializeOptions`](../../angular/nx-devkit/index#jsonserializeoptions) | Optional JSON Parse and Serialize Options                                                            |

#### Returns

`void`

---

### updateProjectConfiguration

▸ **updateProjectConfiguration**(`tree`, `projectName`, `projectConfiguration`): `void`

Updates the configuration of an existing project.

The project configuration is stored in workspace.json and nx.json. The utility will update
both files.

#### Parameters

| Name                   | Type                                                                                                                                                                    | Description                                                             |
| :--------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------- |
| `tree`                 | [`Tree`](../../angular/nx-devkit/index#tree)                                                                                                                            | the file system tree                                                    |
| `projectName`          | `string`                                                                                                                                                                | unique name. Often directories are part of the name (e.g., mydir-mylib) |
| `projectConfiguration` | [`ProjectConfiguration`](../../angular/nx-devkit/index#projectconfiguration) & [`NxJsonProjectConfiguration`](../../angular/nx-devkit/index#nxjsonprojectconfiguration) | project configuration                                                   |

#### Returns

`void`

---

### updateTsConfigsToJs

▸ **updateTsConfigsToJs**(`tree`, `options`): `void`

#### Parameters

| Name                  | Type                                         |
| :-------------------- | :------------------------------------------- |
| `tree`                | [`Tree`](../../angular/nx-devkit/index#tree) |
| `options`             | `Object`                                     |
| `options.projectRoot` | `string`                                     |

#### Returns

`void`

---

### updateWorkspaceConfiguration

▸ **updateWorkspaceConfiguration**(`tree`, `workspaceConfig`): `void`

Update general workspace configuration such as the default project or cli settings.

This does _not_ update projects configuration, use [updateProjectConfiguration](../../angular/nx-devkit/index#updateprojectconfiguration) or [addProjectConfiguration](../../angular/nx-devkit/index#addprojectconfiguration) instead.

#### Parameters

| Name              | Type                                                                             |
| :---------------- | :------------------------------------------------------------------------------- |
| `tree`            | [`Tree`](../../angular/nx-devkit/index#tree)                                     |
| `workspaceConfig` | [`WorkspaceConfiguration`](../../angular/nx-devkit/index#workspaceconfiguration) |

#### Returns

`void`

---

### visitNotIgnoredFiles

▸ **visitNotIgnoredFiles**(`tree`, `dirPath?`, `visitor`): `void`

Utility to act on all files in a tree that are not ignored by git.

#### Parameters

| Name      | Type                                         |
| :-------- | :------------------------------------------- |
| `tree`    | [`Tree`](../../angular/nx-devkit/index#tree) |
| `dirPath` | `string`                                     |
| `visitor` | (`path`: `string`) => `void`                 |

#### Returns

`void`

---

### writeJson

▸ **writeJson**<`T`\>(`tree`, `path`, `value`, `options?`): `void`

Writes a JSON value to the file system tree

#### Type parameters

| Name | Type                       |
| :--- | :------------------------- |
| `T`  | extends ` object``object ` |

#### Parameters

| Name       | Type                                                                         | Description                     |
| :--------- | :--------------------------------------------------------------------------- | :------------------------------ |
| `tree`     | [`Tree`](../../angular/nx-devkit/index#tree)                                 | File system tree                |
| `path`     | `string`                                                                     | Path of JSON file in the Tree   |
| `value`    | `T`                                                                          | Serializable value to write     |
| `options?` | [`JsonSerializeOptions`](../../angular/nx-devkit/index#jsonserializeoptions) | Optional JSON Serialize Options |

#### Returns

`void`

---

### writeJsonFile

▸ **writeJsonFile**<`T`\>(`path`, `data`, `options?`): `void`

Serializes the given data to JSON and writes it to a file.

#### Type parameters

| Name | Type                       |
| :--- | :------------------------- |
| `T`  | extends ` object``object ` |

#### Parameters

| Name       | Type               | Description                                                     |
| :--------- | :----------------- | :-------------------------------------------------------------- |
| `path`     | `string`           | A path to a file.                                               |
| `data`     | `T`                | data which should be serialized to JSON and written to the file |
| `options?` | `JsonWriteOptions` | JSON serialize options                                          |

#### Returns

`void`
