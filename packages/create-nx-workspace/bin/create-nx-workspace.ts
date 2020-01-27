#!/usr/bin/env node

// we can import from '@nrwl/workspace' because it will require typescript
import { output } from '@nrwl/workspace/src/utils/output';
import { execSync } from 'child_process';
import { writeFileSync } from 'fs';
import * as inquirer from 'inquirer';
import * as path from 'path';
import { dirSync } from 'tmp';
import * as yargsParser from 'yargs-parser';
import { determinePackageManager, showNxWarning } from './shared';

enum Preset {
  Empty = 'empty',
  WebComponents = 'web-components',
  Angular = 'angular',
  AngularWithNest = 'angular-nest',
  React = 'react',
  ReactWithExpress = 'react-express',
  NextJs = 'next'
}

const presetOptions = [
  {
    value: Preset.Empty,
    name: 'empty             [an empty workspace]'
  },
  {
    value: 'web-components',
    name:
      'web components    [a workspace with a single app built using web components]'
  },
  {
    value: Preset.Angular,
    name: 'angular           [a workspace with a single Angular application]'
  },
  {
    value: Preset.AngularWithNest,
    name:
      'angular-nest      [a workspace with a full stack application (Angular + Nest)]'
  },
  {
    value: Preset.React,
    name: 'react             [a workspace with a single React application]'
  },
  {
    value: Preset.ReactWithExpress,
    name:
      'react-express     [a workspace with a full stack application (React + Express)]'
  },
  {
    value: Preset.NextJs,
    name: 'next.js           [a workspace with a single Next.js application]'
  }
];

const tsVersion = 'TYPESCRIPT_VERSION';
const cliVersion = 'NX_VERSION';
const nxVersion = 'NX_VERSION';
const angularCliVersion = 'ANGULAR_CLI_VERSION';
const prettierVersion = 'PRETTIER_VERSION';

const parsedArgs = yargsParser(process.argv, {
  string: ['cli', 'preset', 'appName', 'style'],
  alias: {
    appName: 'app-name'
  },
  boolean: ['help', 'interactive']
});

if (parsedArgs.help) {
  showHelp();
  process.exit(0);
}
const packageManager = determinePackageManager();
determineWorkspaceName(parsedArgs).then(name => {
  determinePreset(parsedArgs).then(preset => {
    return determineAppName(preset, parsedArgs).then(appName => {
      return determineStyle(preset, parsedArgs).then(style => {
        return determineCli(preset, parsedArgs).then(cli => {
          const tmpDir = createSandbox(packageManager, cli);
          createApp(
            tmpDir,
            cli,
            parsedArgs,
            name,
            preset,
            appName,
            style,
            parsedArgs.interactive
          );
          showCliWarning(preset, parsedArgs);
          showNxWarning(name);
          pointToTutorialAndCourse(preset);
        });
      });
    });
  });
});

function showHelp() {
  const options = Object.values(Preset)
    .map(preset => '"' + preset + '"')
    .join(', ');

  console.log(`
  Usage: create-nx-workspace <name> [options] [new workspace options]

  Create a new Nx workspace

  Options:

    name                      workspace name (e.g., org name)

    preset                    What to create in a new workspace (options: ${options})

    appName                   the name of the application created by some presets  

    cli                       CLI to power the Nx workspace (options: "nx", "angular")
    
    style                     default style option to be used when a non-empty preset is selected 
                              options: ("css", "scss", "styl", "less") for React/Next.js also ("styled-components", "@emotion/styled")

    interactive               Enable interactive mode when using presets (boolean)

    [new workspace options]   any 'new workspace' options
`);
}

function determineWorkspaceName(parsedArgs: any): Promise<string> {
  const workspaceName: string = parsedArgs._[2];

  if (workspaceName) {
    return Promise.resolve(workspaceName);
  }

  return inquirer
    .prompt([
      {
        name: 'WorkspaceName',
        message: `Workspace name (e.g., org name)    `,
        type: 'string'
      }
    ])
    .then(a => {
      if (!a.WorkspaceName) {
        output.error({
          title: 'Invalid workspace name',
          bodyLines: [`Workspace name cannot be empty`]
        });
        process.exit(1);
      }
      return a.WorkspaceName;
    });
}

function determinePreset(parsedArgs: any): Promise<Preset> {
  if (parsedArgs.preset) {
    if (Object.values(Preset).indexOf(parsedArgs.preset) === -1) {
      output.error({
        title: 'Invalid preset',
        bodyLines: [
          `It must be one of the following:`,
          '',
          ...Object.values(Preset)
        ]
      });
      process.exit(1);
    } else {
      return Promise.resolve(parsedArgs.preset);
    }
  }

  return inquirer
    .prompt([
      {
        name: 'Preset',
        message: `What to create in the new workspace`,
        default: 'empty',
        type: 'list',
        choices: presetOptions
      }
    ])
    .then((a: { Preset: Preset }) => a.Preset);
}

function determineAppName(preset: Preset, parsedArgs: any): Promise<string> {
  if (preset === Preset.Empty) {
    return Promise.resolve('');
  }

  if (parsedArgs.appName) {
    return Promise.resolve(parsedArgs.appName);
  }

  return inquirer
    .prompt([
      {
        name: 'AppName',
        message: `Application name                   `,
        type: 'string'
      }
    ])
    .then(a => {
      if (!a.AppName) {
        output.error({
          title: 'Invalid name',
          bodyLines: [`Name cannot be empty`]
        });
        process.exit(1);
      }
      return a.AppName;
    });
}

function determineCli(preset: Preset, parsedArgs: any) {
  const angular = {
    package: '@angular/cli',
    version: angularCliVersion,
    command: 'ng'
  };

  const nx = {
    package: '@nrwl/tao',
    version: cliVersion,
    command: 'tao'
  };

  if (parsedArgs.cli) {
    if (['nx', 'angular'].indexOf(parsedArgs.cli) === -1) {
      output.error({
        title: 'Invalid cli',
        bodyLines: [`It must be one of the following:`, '', 'nx', 'angular']
      });
      process.exit(1);
    }
    return Promise.resolve(parsedArgs.cli === 'angular' ? angular : nx);
  }

  switch (preset) {
    case Preset.Angular:
    case Preset.AngularWithNest: {
      return Promise.resolve(angular);
    }
    case Preset.WebComponents:
    case Preset.React:
    case Preset.ReactWithExpress:
    case Preset.NextJs: {
      return Promise.resolve(nx);
    }
    default: {
      return inquirer
        .prompt([
          {
            name: 'CLI',
            message: `CLI to power the Nx workspace      `,
            default: 'nx',
            type: 'list',
            choices: [
              {
                value: 'nx',
                name:
                  'Nx           [Extensible CLI for JavaScript and TypeScript applications]'
              },

              {
                value: 'angular',
                name:
                  'Angular CLI  [Extensible CLI for Angular applications. Recommended for Angular projects.]'
              }
            ]
          }
        ])
        .then((a: { CLI: string }) => (a.CLI === 'angular' ? angular : nx));
    }
  }
}

function determineStyle(preset: Preset, parsedArgs: any) {
  if (preset === Preset.Empty) {
    return Promise.resolve(null);
  }

  const choices = [
    {
      value: 'css',
      name: 'CSS'
    },
    {
      value: 'scss',
      name: 'SASS(.scss)  [ http://sass-lang.com   ]'
    },
    {
      value: 'styl',
      name: 'Stylus(.styl)[ http://stylus-lang.com ]'
    },
    {
      value: 'less',
      name: 'LESS         [ http://lesscss.org     ]'
    }
  ];

  if (preset === Preset.ReactWithExpress || preset === Preset.React) {
    choices.push(
      {
        value: 'styled-components',
        name: 'styled-components [ https://styled-components.com ]'
      },
      {
        value: '@emotion/styled',
        name: 'emotion           [ https://emotion.sh]'
      }
    );
  }

  if (!parsedArgs.style) {
    return inquirer
      .prompt([
        {
          name: 'style',
          message: `Default stylesheet format          `,
          default: 'css',
          type: 'list',
          choices
        }
      ])
      .then(a => a.style);
  }

  const foundStyle = choices.find(choice => choice.value === parsedArgs.style);

  if (foundStyle === undefined) {
    output.error({
      title: 'Invalid style',
      bodyLines: [
        `It must be one of the following:`,
        '',
        ...choices.map(choice => choice.value)
      ]
    });

    process.exit(1);
  }

  return Promise.resolve(parsedArgs.style);
}

function createSandbox(
  packageManager: string,
  cli: { package: string; version: string }
) {
  console.log(`Creating a sandbox with Nx...`);
  const tmpDir = dirSync().name;
  writeFileSync(
    path.join(tmpDir, 'package.json'),
    JSON.stringify({
      dependencies: {
        '@nrwl/workspace': nxVersion,
        [cli.package]: cli.version,
        typescript: tsVersion,
        prettier: prettierVersion
      },
      license: 'MIT'
    })
  );

  execSync(`${packageManager} install --silent`, {
    cwd: tmpDir,
    stdio: [0, 1, 2]
  });

  return tmpDir;
}

function createApp(
  tmpDir: string,
  cli: { command: string },
  parsedArgs: any,
  name: string,
  preset: Preset,
  appName: string,
  style: string | null,
  interactive: boolean
) {
  // creating the app itself
  const args = [
    name,
    ...process.argv
      .slice(parsedArgs._[2] ? 3 : 2)
      .filter(
        a =>
          !a.startsWith('--cli') &&
          !a.startsWith('--preset') &&
          !a.startsWith('--appName') &&
          !a.startsWith('--app-name') &&
          !a.startsWith('--interactive')
      ) // not used by the new command
      .map(a => `"${a}"`)
  ].join(' ');

  const appNameArg = appName ? ` --appName="${appName}"` : ``;
  const styleArg = style ? ` --style="${style}"` : ``;
  const interactiveArg = interactive
    ? ` --interactive=true`
    : ` --interactive=false`;

  console.log(
    `new ${args} --preset="${preset}"${appNameArg}${styleArg}${interactiveArg} --collection=@nrwl/workspace`
  );
  execSync(
    `"${path.join(
      tmpDir,
      'node_modules',
      '.bin',
      cli.command
    )}" new ${args} --preset="${preset}"${appNameArg}${styleArg}${interactiveArg} --collection=@nrwl/workspace`,
    {
      stdio: [0, 1, 2]
    }
  );
}

function showCliWarning(preset: Preset, parsedArgs: yargsParser.Arguments) {
  if (!parsedArgs.cli) {
    switch (preset) {
      case Preset.Angular:
      case Preset.AngularWithNest:
        {
          output.addVerticalSeparator();
          output.note({
            title: `Because you selected an Angular-specific preset, we generated an Nx workspace powered by the Angular CLI.`,
            bodyLines: [
              `Run 'create-nx-workspace --help' to see how to select a different CLI.`
            ]
          });
        }
        break;
      case Preset.WebComponents:
      case Preset.React:
      case Preset.ReactWithExpress:
      case Preset.NextJs:
        {
          output.addVerticalSeparator();
          output.note({
            title: `We generated an Nx workspace powered by the Nx CLI.`,
            bodyLines: [
              `Run 'create-nx-workspace --help' to see how to select a different CLI.`
            ]
          });
        }
        break;
    }
  }
}

function pointToTutorialAndCourse(preset: Preset) {
  const title = `First time using Nx? Check out this interactive Nx tutorial.`;
  switch (preset) {
    case Preset.React:
    case Preset.ReactWithExpress:
    case Preset.NextJs:
      output.addVerticalSeparator();
      output.note({
        title: title,
        bodyLines: [
          `https://nx.dev/react/tutorial/01-create-application`,
          ...pointToCourse()
        ]
      });
      break;
    case Preset.Angular:
    case Preset.AngularWithNest:
      output.addVerticalSeparator();
      output.note({
        title: title,
        bodyLines: [
          `https://nx.dev/angular/tutorial/01-create-application`,
          ...pointToCourse()
        ]
      });
      break;
    case Preset.WebComponents:
      output.addVerticalSeparator();
      output.note({
        title: title,
        bodyLines: [
          `https://nx.dev/web/tutorial/01-create-application`,
          ...pointToCourse()
        ]
      });
      break;
  }
}

function pointToCourse(): string[] {
  return [
    ``,
    `Prefer watching videos? Check out this free Nx course on YouTube.`,
    `https://www.youtube.com/watch?v=2mYLe9Kp9VM&list=PLakNactNC1dH38AfqmwabvOszDmKriGco`
  ];
}
