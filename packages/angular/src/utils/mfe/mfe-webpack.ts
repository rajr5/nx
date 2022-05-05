import {
  joinPathFragments,
  logger,
  readJsonFile,
  workspaceRoot,
} from '@nrwl/devkit';
import {
  getRootTsConfigPath,
  readTsConfig,
} from '@nrwl/workspace/src/utilities/typescript';
import { existsSync, lstatSync, readdirSync } from 'fs';
import { dirname, join, normalize, relative } from 'path';
import { ParsedCommandLine } from 'typescript';
import { NormalModuleReplacementPlugin } from 'webpack';

export interface SharedLibraryConfig {
  singleton: boolean;
  strictVersion: boolean;
  requiredVersion: string;
  eager: boolean;
}

export function shareWorkspaceLibraries(
  libraries: string[],
  tsConfigPath = process.env.NX_TSCONFIG_PATH ?? getRootTsConfigPath()
) {
  if (!existsSync(tsConfigPath)) {
    throw new Error(
      `NX MFE: TsConfig Path for workspace libraries does not exist! (${tsConfigPath})`
    );
  }

  const tsConfig: ParsedCommandLine = readTsConfig(tsConfigPath);
  const tsconfigPathAliases = tsConfig.options?.paths;

  if (!tsconfigPathAliases) {
    return {
      getAliases: () => [],
      getLibraries: () => {},
      getReplacementPlugin: () =>
        new NormalModuleReplacementPlugin(/./, () => {}),
    };
  }

  const pathMappings: { name: string; path: string }[] = [];
  for (const [key, paths] of Object.entries(tsconfigPathAliases)) {
    if (libraries && libraries.includes(key)) {
      const pathToLib = normalize(join(workspaceRoot, paths[0]));
      pathMappings.push({
        name: key,
        path: pathToLib,
      });
    }
  }

  return {
    getAliases: () =>
      pathMappings.reduce(
        (aliases, library) => ({ ...aliases, [library.name]: library.path }),
        {}
      ),
    getLibraries: (eager?: boolean): Record<string, SharedLibraryConfig> =>
      pathMappings.reduce(
        (libraries, library) => ({
          ...libraries,
          [library.name]: { requiredVersion: false, eager },
        }),
        {}
      ),
    getReplacementPlugin: () =>
      new NormalModuleReplacementPlugin(/./, (req) => {
        if (!req.request.startsWith('.')) {
          return;
        }

        const from = req.context;
        const to = normalize(join(req.context, req.request));

        for (const library of pathMappings) {
          const libFolder = normalize(dirname(library.path));
          if (!from.startsWith(libFolder) && to.startsWith(libFolder)) {
            req.request = library.name;
          }
        }
      }),
  };
}

function getNonNodeModulesSubDirs(directory: string): string[] {
  return readdirSync(directory)
    .filter((file) => file !== 'node_modules')
    .map((file) => join(directory, file))
    .filter((file) => lstatSync(file).isDirectory());
}

function recursivelyCollectSecondaryEntryPointsFromDirectory(
  pkgName: string,
  pkgVersion: string,
  pkgRoot: string,
  directories: string[],
  collectedPackages: { name: string; version: string }[]
): void {
  for (const directory of directories) {
    const packageJsonPath = join(directory, 'package.json');
    if (existsSync(packageJsonPath)) {
      const importName = joinPathFragments(
        pkgName,
        relative(pkgRoot, directory)
      );

      try {
        // require the secondary entry point to try to rule out sample code
        require.resolve(importName, { paths: [workspaceRoot] });
        const { name } = readJsonFile(packageJsonPath);
        // further check to make sure what we were able to require is the
        // same as the package name
        if (name === importName) {
          collectedPackages.push({ name, version: pkgVersion });
        }
      } catch {}
    }

    const subDirs = getNonNodeModulesSubDirs(directory);
    recursivelyCollectSecondaryEntryPointsFromDirectory(
      pkgName,
      pkgVersion,
      pkgRoot,
      subDirs,
      collectedPackages
    );
  }
}

function collectPackageSecondaryEntryPoints(
  pkgName: string,
  pkgVersion: string,
  collectedPackages: { name: string; version: string }[]
): void {
  const packageJsonPath = require.resolve(`${pkgName}/package.json`, {
    paths: [workspaceRoot],
  });
  const pathToPackage = dirname(packageJsonPath);
  const subDirs = getNonNodeModulesSubDirs(pathToPackage);
  recursivelyCollectSecondaryEntryPointsFromDirectory(
    pkgName,
    pkgVersion,
    pathToPackage,
    subDirs,
    collectedPackages
  );
}

export function sharePackages(
  packages: string[]
): Record<string, SharedLibraryConfig> {
  const pkgJsonPath = joinPathFragments(workspaceRoot, 'package.json');
  if (!existsSync(pkgJsonPath)) {
    throw new Error(
      'NX MFE: Could not find root package.json to determine dependency versions.'
    );
  }

  const pkgJson = readJsonFile(pkgJsonPath);
  const allPackages: { name: string; version: string }[] = [];
  packages.forEach((pkg) => {
    const pkgVersion =
      pkgJson.dependencies?.[pkg] ?? pkgJson.devDependencies?.[pkg];
    allPackages.push({ name: pkg, version: pkgVersion });
    collectPackageSecondaryEntryPoints(pkg, pkgVersion, allPackages);
  });

  return allPackages.reduce((shared, pkg) => {
    if (!pkg.version) {
      logger.warn(
        `Could not find a version for "${pkg.name}" in the root "package.json" ` +
          'when collecting shared packages for the Module Federation setup. ' +
          'The package will not be shared.'
      );

      return shared;
    }

    return {
      ...shared,
      [pkg.name]: {
        singleton: true,
        strictVersion: true,
        requiredVersion: pkg.version,
      },
    };
  }, {});
}
