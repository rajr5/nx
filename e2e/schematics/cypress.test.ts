import {
  checkFilesExist,
  copyMissingPackages,
  newApp,
  newProject,
  readJson,
  runCLI,
  updateFile,
  readFile,
  ensureProject,
  uniq,
  runsInWSL
} from '../utils';

describe('Cypress E2E Test runner', () => {
  describe('project scaffolding', () => {
    it('should generate an app with the Cypress as e2e test runner', () => {
      ensureProject();
      const myapp = uniq('myapp');
      newApp(`${myapp} --e2eTestRunner=cypress`);

      // Making sure the package.json file contains the Cypress dependency
      const packageJson = readJson('package.json');
      expect(packageJson.devDependencies['cypress']).toBeTruthy();

      // Making sure the cypress folders & files are created
      checkFilesExist(`apps/${myapp}-e2e/cypress.json`);
      checkFilesExist(`apps/${myapp}-e2e/tsconfig.e2e.json`);

      checkFilesExist(`apps/${myapp}-e2e/src/fixtures/example.json`);
      checkFilesExist(`apps/${myapp}-e2e/src/integration/app.spec.ts`);
      checkFilesExist(`apps/${myapp}-e2e/src/plugins/index.ts`);
      checkFilesExist(`apps/${myapp}-e2e/src/support/app.po.ts`);
      checkFilesExist(`apps/${myapp}-e2e/src/support/index.ts`);
      checkFilesExist(`apps/${myapp}-e2e/src/support/commands.ts`);
    }, 1000000);
  });

  if (!runsInWSL()) {
    describe('running Cypress', () => {
      it('should execute e2e tests using Cypress', () => {
        ensureProject();
        const myapp = uniq('myapp');
        newApp(`${myapp} --e2eTestRunner=cypress`);

        expect(
          runCLI(`e2e --project=${myapp}-e2e --headless --watch=false`)
        ).toContain('All specs passed!');

        const originalContents = JSON.parse(
          readFile(`apps/${myapp}-e2e/cypress.json`)
        );
        delete originalContents.fixturesFolder;
        updateFile(
          `apps/${myapp}-e2e/cypress.json`,
          JSON.stringify(originalContents)
        );

        expect(
          runCLI(`e2e --project=${myapp}-e2e --headless --watch=false`)
        ).toContain('All specs passed!');
      }, 1000000);
    });
  }
});
