import * as chalk from 'chalk';
import { appRootPath } from '../app-root';
import {
  detectPackageManager,
  getPackageManagerInstallCommand,
} from '../detect-package-manager';
import { readJsonFile } from '../fileutils';
import { output } from '../output';
import { PluginCapabilities } from './models';
import { hasElements } from './shared';

function tryGetCollection<T>(
  workspaceRoot: string,
  pluginName: string,
  jsonFile: string,
  propName: string
): T {
  if (!jsonFile) {
    return null;
  }

  try {
    const jsonFilePath = require.resolve(`${pluginName}/${jsonFile}`, {
      paths: [workspaceRoot],
    });
    return readJsonFile<T>(jsonFilePath)[propName];
  } catch {
    return null;
  }
}

export function getPluginCapabilities(
  workspaceRoot: string,
  pluginName: string
): PluginCapabilities {
  try {
    const packageJsonPath = require.resolve(`${pluginName}/package.json`, {
      paths: [workspaceRoot],
    });
    const packageJson = readJsonFile(packageJsonPath);
    return {
      name: pluginName,
      generators:
        tryGetCollection(
          workspaceRoot,
          pluginName,
          packageJson.generators,
          'generators'
        ) ||
        tryGetCollection(
          workspaceRoot,
          pluginName,
          packageJson.schematics,
          'schematics'
        ),
      executors:
        tryGetCollection(
          workspaceRoot,
          pluginName,
          packageJson.executors,
          'executors'
        ) ||
        tryGetCollection(
          workspaceRoot,
          pluginName,
          packageJson.builders,
          'builders'
        ),
    };
  } catch {
    return null;
  }
}

export function listPluginCapabilities(pluginName: string) {
  const plugin = getPluginCapabilities(appRootPath, pluginName);

  if (!plugin) {
    const packageManager = detectPackageManager();
    output.note({
      title: `${pluginName} is not currently installed`,
      bodyLines: [
        `Use "${getPackageManagerInstallCommand(
          packageManager,
          true
        )} ${pluginName}" to add new capabilities`,
      ],
    });

    return;
  }

  const hasBuilders = hasElements(plugin.executors);
  const hasGenerators = hasElements(plugin.generators);

  if (!hasBuilders && !hasGenerators) {
    output.warn({ title: `No capabilities found in ${pluginName}` });
    return;
  }

  const bodyLines = [];

  if (hasGenerators) {
    bodyLines.push(chalk.bold(chalk.green('GENERATORS')));
    bodyLines.push('');
    bodyLines.push(
      ...Object.keys(plugin.generators).map(
        (name) => `${chalk.bold(name)} : ${plugin.generators[name].description}`
      )
    );
    if (hasBuilders) {
      bodyLines.push('');
    }
  }

  if (hasBuilders) {
    bodyLines.push(chalk.bold(chalk.green('EXECUTORS/BUILDERS')));
    bodyLines.push('');
    bodyLines.push(
      ...Object.keys(plugin.executors).map(
        (name) => `${chalk.bold(name)} : ${plugin.executors[name].description}`
      )
    );
  }

  output.log({
    title: `Capabilities in ${plugin.name}:`,
    bodyLines,
  });
}
