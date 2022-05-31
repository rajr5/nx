import { splitArgsIntoNxArgsAndOverrides } from './command-line-utils';

jest.mock('../project-graph/file-utils');

describe('splitArgs', () => {
  it('should split nx specific arguments into nxArgs', () => {
    expect(
      splitArgsIntoNxArgsAndOverrides(
        {
          base: 'sha1',
          head: 'sha2',
          notNxArg: true,
          _: ['--override'],
          $0: '',
        },
        'affected',
        {} as any,
        {} as any
      ).nxArgs
    ).toEqual({
      base: 'sha1',
      head: 'sha2',
      skipNxCache: false,
    });
  });

  it('should put every command start with nx to nxArgs', () => {
    const nxArgs = splitArgsIntoNxArgsAndOverrides(
      {
        'nx-key': 'some-value',
        nxKey: 'some-value',
        _: ['--override'],
        $0: '',
      },
      'affected',
      {} as any,
      {} as any
    ).nxArgs;
    expect(nxArgs['nxKey']).toEqual('some-value');
  });

  it('should default to having a base of main', () => {
    expect(
      splitArgsIntoNxArgsAndOverrides(
        {
          notNxArg: true,
          _: ['--override'],
          $0: '',
        },
        'affected',
        {} as any,
        {} as any
      ).nxArgs
    ).toEqual({
      base: 'main',
      skipNxCache: false,
    });
  });

  it('should return configured base branch from nx.json', () => {
    expect(
      splitArgsIntoNxArgsAndOverrides(
        {
          notNxArg: true,
          _: ['--override'],
          $0: '',
        },
        'affected',
        {} as any,
        { affected: { defaultBase: 'develop' } }
      ).nxArgs
    ).toEqual({
      base: 'develop',
      skipNxCache: false,
    });
  });

  it('should return a default base branch if not configured in nx.json', () => {
    expect(
      splitArgsIntoNxArgsAndOverrides(
        {
          notNxArg: true,
          _: ['--override'],
          $0: '',
        },
        'affected',
        {} as any,
        {} as any
      ).nxArgs
    ).toEqual({
      base: 'main',
      skipNxCache: false,
    });
  });

  it('should split non nx specific arguments into target args', () => {
    expect(
      splitArgsIntoNxArgsAndOverrides(
        {
          files: [''],
          notNxArg: true,
          _: ['--override'],
          $0: '',
        },
        'affected',
        {} as any,
        {} as any
      ).overrides
    ).toEqual({
      notNxArg: true,
      override: true,
    });
  });

  it('should set base and head in the affected mode', () => {
    const { nxArgs, overrides } = splitArgsIntoNxArgsAndOverrides(
      {
        notNxArg: true,
        _: ['affected', '--name', 'bob', 'sha1', 'sha2', '--override'],
        $0: '',
      },
      'affected',
      {} as any,
      {} as any
    );

    expect(nxArgs).toEqual({
      base: 'sha1',
      head: 'sha2',
      skipNxCache: false,
    });
    expect(overrides).toEqual({
      notNxArg: true,
      override: true,
      name: 'bob',
    });
  });

  it('should set base and head based on environment variables in affected mode, if they are not provided directly on the command', () => {
    const originalNxBase = process.env.NX_BASE;
    process.env.NX_BASE = 'envVarSha1';
    const originalNxHead = process.env.NX_HEAD;
    process.env.NX_HEAD = 'envVarSha2';

    expect(
      splitArgsIntoNxArgsAndOverrides(
        {
          notNxArg: true,
          _: ['--override'],
          $0: '',
        },
        'affected',
        {} as any,
        {} as any
      ).nxArgs
    ).toEqual({
      base: 'envVarSha1',
      head: 'envVarSha2',
      skipNxCache: false,
    });

    expect(
      splitArgsIntoNxArgsAndOverrides(
        {
          notNxArg: true,
          _: ['--override'],
          $0: '',
          head: 'directlyOnCommandSha1', // higher priority than $NX_HEAD
        },
        'affected',
        {} as any,
        {} as any
      ).nxArgs
    ).toEqual({
      base: 'envVarSha1',
      head: 'directlyOnCommandSha1',
      skipNxCache: false,
    });

    expect(
      splitArgsIntoNxArgsAndOverrides(
        {
          notNxArg: true,
          _: ['--override'],
          $0: '',
          base: 'directlyOnCommandSha2', // higher priority than $NX_BASE
        },
        'affected',
        {} as any,
        {} as any
      ).nxArgs
    ).toEqual({
      base: 'directlyOnCommandSha2',
      head: 'envVarSha2',
      skipNxCache: false,
    });

    // Reset process data
    process.env.NX_BASE = originalNxBase;
    process.env.NX_HEAD = originalNxHead;
  });

  it('should not set base and head in the run-one mode', () => {
    const { nxArgs, overrides } = splitArgsIntoNxArgsAndOverrides(
      {
        notNxArg: true,
        _: ['--exclude=file'],
        $0: '',
      },
      'run-one',
      {} as any,
      {} as any
    );

    expect(nxArgs).toEqual({
      skipNxCache: false,
    });
    expect(overrides).toEqual({
      notNxArg: true,
      exclude: 'file',
    });
  });

  describe('--parallel', () => {
    it('should be a number', () => {
      const parallel = splitArgsIntoNxArgsAndOverrides(
        {
          _: [],
          $0: '',
          parallel: '5',
        },
        'affected',
        {} as any,
        {} as any
      ).nxArgs.parallel;

      expect(parallel).toEqual(5);
    });

    it('should default to 3', () => {
      const parallel = splitArgsIntoNxArgsAndOverrides(
        {
          _: [],
          $0: '',
          parallel: '',
        },
        'affected',
        {} as any,
        {} as any
      ).nxArgs.parallel;

      expect(parallel).toEqual(3);
    });

    it('should be 3 when set to true', () => {
      const parallel = splitArgsIntoNxArgsAndOverrides(
        {
          _: [],
          $0: '',
          parallel: 'true',
        },
        'affected',
        {} as any,
        {} as any
      ).nxArgs.parallel;

      expect(parallel).toEqual(3);
    });

    it('should be 1 when set to false', () => {
      const parallel = splitArgsIntoNxArgsAndOverrides(
        {
          _: [],
          $0: '',
          parallel: 'false',
        },
        'affected',
        {} as any,
        {} as any
      ).nxArgs.parallel;

      expect(parallel).toEqual(1);
    });

    it('should use the maxParallel option when given', () => {
      const parallel = splitArgsIntoNxArgsAndOverrides(
        {
          _: [],
          $0: '',
          parallel: '',
          maxParallel: 5,
        },
        'affected',
        {} as any,
        {} as any
      ).nxArgs.parallel;

      expect(parallel).toEqual(5);
    });

    it('should use the maxParallel option when given', () => {
      const parallel = splitArgsIntoNxArgsAndOverrides(
        {
          _: [],
          $0: '',
          parallel: '',
          maxParallel: 5,
        },
        'affected',
        {} as any,
        {} as any
      ).nxArgs.parallel;

      expect(parallel).toEqual(5);
    });
  });
});
