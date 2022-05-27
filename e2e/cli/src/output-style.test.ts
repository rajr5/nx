import { newProject, runCLI, updateProjectConfig } from '@nrwl/e2e/utils';

describe('Output Style', () => {
  beforeEach(() => newProject());

  it('ttt should stream output', async () => {
    const myapp = 'abcdefghijklmon';
    runCLI(`generate @nrwl/web:app ${myapp}`);
    updateProjectConfig(myapp, (c) => {
      c.targets['inner'] = {
        executor: '@nrwl/workspace:run-commands',
        options: {
          command: 'echo inner',
        },
      };
      c.targets['echo'] = {
        executor: '@nrwl/workspace:run-commands',
        options: {
          commands: ['echo 1', 'echo 2', `nx inner ${myapp}`],
          parallel: false,
        },
      };
      return c;
    });

    const withPrefixes = runCLI(`echo ${myapp} --output-style=stream`).split(
      '\n'
    );
    expect(withPrefixes).toContain(`[${myapp}] 1`);
    expect(withPrefixes).toContain(`[${myapp}] 2`);
    expect(withPrefixes).toContain(`[${myapp}] inner`);

    const noPrefixes = runCLI(
      `echo ${myapp} --output-style=stream-without-prefixes`
    );
    expect(noPrefixes).not.toContain(`[${myapp}]`);
  });
});
