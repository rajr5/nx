# storybook

Serve Storybook

Options can be configured in `workspace.json` when defining the executor, or when invoking it.
Read more about how to use executors and the CLI here: https://nx.dev/node/getting-started/nx-cli#running-tasks.

## Options

### uiFramework (_**required**_) (**hidden**)

Default: `@storybook/angular`

Type: `string`

Possible values: `@storybook/angular`, `@storybook/react`, `@storybook/html`

Storybook framework npm package

### docsMode

Default: `false`

Type: `boolean`

Build a documentation-only site using addon-docs.

### host

Default: `localhost`

Type: `string`

Host to listen on.

### https

Default: `false`

Type: `boolean`

Serve using HTTPS.

### port

Default: `9009`

Type: `number`

Port to listen on.

### projectBuildConfig

Type: `string`

Workspace project where Storybook reads the Webpack config from

### quiet

Default: `true`

Type: `boolean`

Suppress verbose build output.

### sslCert

Type: `string`

SSL certificate to use for serving HTTPS.

### sslKey

Type: `string`

SSL key to use for serving HTTPS.

### staticDir

Type: `array`

Directory where to load static files from, array of strings

### watch

Default: `true`

Type: `boolean`

Watches for changes and rebuilds application
