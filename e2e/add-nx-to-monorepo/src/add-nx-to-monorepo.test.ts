import {
  createNonNxProjectDirectory,
  runCLI,
  runCommand,
  tmpProjPath,
  updateFile,
  getPackageManagerCommand,
  getSelectedPackageManager,
} from '@nrwl/e2e/utils';
import { Workspaces } from 'nx/src/config/workspaces';

describe('add-nx-to-monorepo', () => {
  const packageManagerCommand = getPackageManagerCommand({
    packageManager: getSelectedPackageManager(),
  }).runUninstalledPackage;

  it('should not throw', () => {
    if (packageManagerCommand) {
      // Arrange
      createNonNxProjectDirectory();
      updateFile(
        'packages/package-a/package.json',
        JSON.stringify({
          name: 'package-a',
        })
      );
      updateFile(
        'packages/package-b/package.json',
        JSON.stringify({
          name: 'package-b',
        })
      );

      // Act
      const output = runCommand(
        `${packageManagerCommand} add-nx-to-monorepo --nx-cloud false`
      );
      // Assert
      expect(output).toContain('🎉 Done!');
      expect(readWorkspaceConfig().projects['package-a']).toBeTruthy();
      expect(readWorkspaceConfig().projects['package-b']).toBeTruthy();
    }
  });

  it('should build', () => {
    if (packageManagerCommand) {
      // Arrange
      createNonNxProjectDirectory();
      updateFile(
        'packages/package-a/package.json',
        JSON.stringify({
          name: 'package-a',
          scripts: {
            build: 'echo "build successful"',
          },
        })
      );

      // Act
      runCommand(
        `${packageManagerCommand} add-nx-to-monorepo --nx-cloud false`
      );
      const output = runCLI('build package-a');
      // Assert
      expect(output).toContain('build successful');
    }
  });
});

const readWorkspaceConfig = () =>
  new Workspaces(tmpProjPath()).readWorkspaceConfiguration();
