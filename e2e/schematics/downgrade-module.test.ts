import {
  ensureProject,
  expectTestsPass,
  newApp,
  newProject,
  runCLI,
  runCLIAsync,
  uniq,
  updateFile
} from '../utils';

describe('DowngradeModule', () => {
  it('should generate a downgradeModule setup', async () => {
    ensureProject();

    const myapp = uniq('myapp');
    newApp(`${myapp} --unit-test-runner=karma`);

    updateFile(
      `apps/${myapp}/src/legacy.js`,
      `window.angular.module('legacy', []);`
    );

    runCLI(
      `generate downgrade-module legacy --angularJsImport=./legacy --project=${myapp}`
    );

    runCLI(`build ${myapp}`);
    expect(runCLI(`test ${myapp} --no-watch`)).toContain('3 SUCCESS');
  }, 1000000);
});
