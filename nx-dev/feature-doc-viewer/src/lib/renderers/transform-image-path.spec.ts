import { transformImagePath } from './transform-image-path';

describe('transformImagePath', () => {
  it('should transform relative paths', () => {
    const opts = {
      document: {
        content: '',
        excerpt: '',
        filePath:
          'nx-dev/nx-dev/public/documentation/latest/shared/using-nx/dte.md',
        data: {},
      },
    };
    const transform = transformImagePath(opts);

    expect(transform('./test.png')).toEqual(
      '/documentation/latest/shared/using-nx/test.png'
    );
    expect(transform('../test.png')).toEqual(
      '/documentation/latest/shared/test.png'
    );
    expect(transform('../../test.png')).toEqual(
      '/documentation/latest/test.png'
    );
  });

  it('should transform absolute paths', () => {
    const opts = {
      version: {
        name: 'Latest',
        id: 'latest',
        alias: 'l',
        release: '12.9.0',
        path: 'latest',
        default: true,
      },
      document: {
        content: '',
        excerpt: '',
        filePath:
          'nx-dev/nx-dev/public/documentation/latest/angular/generators/workspace-generators.md',
        data: {},
      },
    };
    const transform = transformImagePath(opts);

    expect(transform('/shared/test.png')).toEqual(
      '/documentation/shared/test.png'
    );
  });
});
