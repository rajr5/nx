import {
  ensureProject,
  uniq,
  runCommand,
  checkFilesExist,
  forEachCli
} from './utils';

forEachCli(() => {
  describe('Delegate to CLI', () => {
    it('should delegate to the cli all non-standard commands', async () => {
      ensureProject();

      const appName = uniq('app');
      runCommand(`npm run nx -- g @nrwl/web:app ${appName}`);
      runCommand(`npm run nx -- build ${appName}`);

      checkFilesExist(
        `dist/apps/${appName}/index.html`,
        `dist/apps/${appName}/polyfills-es2015.js`,
        `dist/apps/${appName}/runtime-es2015.js`,
        `dist/apps/${appName}/main-es2015.js`,
        `dist/apps/${appName}/styles-es2015.js`,
        `dist/apps/${appName}/polyfills-es5.js`,
        `dist/apps/${appName}/runtime-es5.js`,
        `dist/apps/${appName}/main-es5.js`,
        `dist/apps/${appName}/styles-es5.js`
      );
    }, 120000);
  });
});
