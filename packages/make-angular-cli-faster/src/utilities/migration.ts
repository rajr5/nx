import {
  getPackageManagerCommand,
  output,
  readJsonFile,
  workspaceRoot,
} from '@nrwl/devkit';
import { execSync } from 'child_process';
import { prompt } from 'enquirer';
import { lt, lte, major, satisfies } from 'semver';
import { resolvePackageVersion } from './package-manager';
import { MigrationDefinition } from './types';

// up to this version the generator was in the @nrwl/workspace package
const latestWorkspaceRangeVersionWithMigration = '~13.9.3';
let latestWorkspaceVersionWithMigration: string;
// up to this version the preserveAngularCLILayout option was used
const latestVersionWithOldFlag = '13.8.3';
// map of Angular major versions to the versions of Nx that are compatible with them,
// key is the Angular major version, value is an object with the range of supported
// versions and the max version of the range if there's a bigger major version that
// is already supported
const nxAngularVersionMap: Record<number, { range: string; max?: string }> = {
  13: { range: '>= 13.2.0 < 14.2.0', max: '~14.1.0' },
  14: { range: '>= 14.2.0' },
};
// latest major version of Angular that is compatible with Nx, based on the map above
const latestCompatibleAngularMajorVersion = Math.max(
  ...Object.keys(nxAngularVersionMap).map((x) => +x)
);

export async function determineMigration(
  version: string | undefined
): Promise<MigrationDefinition> {
  const angularVersion = getInstalledAngularVersion();
  const majorAngularVersion = major(angularVersion);
  latestWorkspaceVersionWithMigration = await resolvePackageVersion(
    '@nrwl/angular',
    latestWorkspaceRangeVersionWithMigration
  );

  if (version) {
    const normalizedVersion = await normalizeVersion(version);
    if (lte(normalizedVersion, latestWorkspaceVersionWithMigration)) {
      // specified version should use @nrwl/workspace:ng-add
      return { packageName: '@nrwl/workspace', version: normalizedVersion };
    }

    // if greater than the latest workspace version with the migration,
    // check the versions map for compatibility with Angular
    if (
      nxAngularVersionMap[majorAngularVersion] &&
      satisfies(
        normalizedVersion,
        nxAngularVersionMap[majorAngularVersion].range
      )
    ) {
      // there's a match, use @nrwl/angular:ng-add
      return { packageName: '@nrwl/angular', version: normalizedVersion };
    }

    // it's not compatible with the currently installed Angular version,
    // suggest the latest possible version to use
    return await findAndSuggestVersionToUse(
      angularVersion,
      majorAngularVersion,
      version
    );
  }

  const latestNxCompatibleVersion =
    await getNxVersionBasedOnInstalledAngularVersion(
      angularVersion,
      majorAngularVersion
    );

  // should use @nrwl/workspace:ng-add if the version is less than the
  // latest workspace version that has the migration, otherwise use
  // @nrwl/angular:ng-add
  return {
    packageName: lte(
      latestNxCompatibleVersion,
      latestWorkspaceVersionWithMigration
    )
      ? '@nrwl/workspace'
      : '@nrwl/angular',
    version: latestNxCompatibleVersion,
  };
}

export function migrateWorkspace(migration: MigrationDefinition): void {
  const preserveAngularCliLayoutFlag = lte(
    migration.version,
    latestVersionWithOldFlag
  )
    ? '--preserveAngularCLILayout'
    : '--preserve-angular-cli-layout';
  execSync(
    `${getPackageManagerCommand().exec} nx g ${
      migration.packageName
    }:ng-add ${preserveAngularCliLayoutFlag}`,
    { stdio: [0, 1, 2] }
  );
}

async function findAndSuggestVersionToUse(
  angularVersion: string,
  majorAngularVersion: number,
  userSpecifiedVersion: string
): Promise<MigrationDefinition> {
  const latestNxCompatibleVersion =
    await getNxVersionBasedOnInstalledAngularVersion(
      angularVersion,
      majorAngularVersion
    );
  const useSuggestedVersion = await promptForVersion(latestNxCompatibleVersion);
  if (useSuggestedVersion) {
    // should use @nrwl/workspace:ng-add if the version is less than the
    // latest workspace version that has the migration, otherwise use
    // @nrwl/angular:ng-add
    return {
      packageName: lte(
        latestNxCompatibleVersion,
        latestWorkspaceVersionWithMigration
      )
        ? '@nrwl/workspace'
        : '@nrwl/angular',
      version: latestNxCompatibleVersion,
    };
  }

  output.error({
    title: `❌ Cannot proceed with the migration.`,
    bodyLines: [
      `The specified Nx version "${userSpecifiedVersion}" is not compatible with the installed Angular version "${angularVersion}".`,
    ],
  });
  process.exit(1);
}

async function getNxVersionBasedOnInstalledAngularVersion(
  angularVersion: string,
  majorAngularVersion: number
): Promise<string> {
  if (lt(angularVersion, '13.0.0')) {
    // the @nrwl/angular:ng-add generator is only available for versions supporting
    // Angular >= 13.0.0, fall back to @nrwl/workspace:ng-add
    return latestWorkspaceVersionWithMigration;
  }
  if (nxAngularVersionMap[majorAngularVersion]?.max) {
    // use the max of the range
    return await resolvePackageVersion(
      '@nrwl/angular',
      nxAngularVersionMap[majorAngularVersion].max
    );
  }
  if (majorAngularVersion > latestCompatibleAngularMajorVersion) {
    // installed Angular version is not supported yet, we can't @nrwl/angular:ng-add,
    // fall back to @nrwl/workspace:ng-add
    return latestWorkspaceVersionWithMigration;
  }

  // use latest, only the last version in the map should not contain a max
  return await resolvePackageVersion('@nrwl/angular', 'latest');
}

async function promptForVersion(version: string): Promise<boolean> {
  const { useVersion } = await prompt<{ useVersion: boolean }>([
    {
      name: 'useVersion',
      message: `The provided version of Nx is not compatible with the installed Angular CLI version. Would you like to use the recommended version "${version}" instead?`,
      type: 'confirm',
      initial: true,
    },
  ]);

  return useVersion;
}

function getInstalledAngularVersion(): string {
  const packageJsonPath = require.resolve('@angular/core/package.json', {
    paths: [workspaceRoot],
  });
  return readJsonFile(packageJsonPath).version;
}

async function normalizeVersion(version: string): Promise<string> {
  if (
    version.startsWith('^') ||
    version.startsWith('~') ||
    version.split('.').length < 3
  ) {
    return await resolvePackageVersion('@nrwl/angular', version);
  }

  return version;
}
