import {
  newApp,
  newLib,
  newProject,
  runCLI,
  updateFile,
  runCommand
} from '../utils';

describe('Nrwl Workspace', () => {
  it(
    'should work',
    () => {
      newProject();
      newApp('myApp --directory=myDir');
      newLib('myLib --directory=myDir --ngmodule');

      updateFile(
        'apps/my-dir/my-app/src/app/app.module.ts',
        `
        import { NgModule } from '@angular/core';
        import { BrowserModule } from '@angular/platform-browser';
        import { MyLibModule } from '@proj/my-dir/my-lib';
        import { AppComponent } from './app.component';

        @NgModule({
          imports: [BrowserModule, MyLibModule],
          declarations: [AppComponent],
          bootstrap: [AppComponent]
        })
        export class AppModule {}
      `
      );

      runCLI('build --aot -a=my-dir/my-app');
      expect(runCLI('test --single-run')).toContain('Executed 2 of 2 SUCCESS');
      expect(runCLI('e2e -a=my-dir/my-app')).toContain('my-app App');
    },
    1000000
  );

  it('should only run unit tests for all apps and e2e tests for a single app', () => {
    newProject();
    newApp('myapp');

    try {
      runCommand('npm run test -- --app myapp --single-run');
      fail('boom');
    } catch (e) {
      expect(e.stderr.toString()).toContain(
        'Nx only supports running unit tests for all apps and libs.'
      );
    }

    try {
      runCommand('npm run e2e');
      fail('boom');
    } catch (e) {
      expect(e.stderr.toString()).toContain(
        'Please provide the app name using --app or -a.'
      );
    }
  });

  it(
    'should support router config generation (lazy)',
    () => {
      newProject();
      newApp('myApp --directory=myDir --routing');
      newLib(
        'myLib --directory=myDir --routing --lazy --parentModule=apps/my-dir/my-app/src/app/app.module.ts'
      );

      runCLI('build --aot -a=my-dir/my-app');
      expect(runCLI('test --single-run')).toContain('Executed 2 of 2 SUCCESS');
    },
    1000000
  );

  it(
    'should support router config generation (eager)',
    () => {
      newProject();
      newApp('myApp --directory=myDir --routing');
      newLib(
        'myLib --directory=myDir --routing --parentModule=apps/my-dir/my-app/src/app/app.module.ts'
      );

      runCLI('build --aot -a=my-dir/my-app');
      expect(runCLI('test --single-run')).toContain('Executed 2 of 2 SUCCESS');
    },
    1000000
  );
});
