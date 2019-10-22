import { Migrator } from './migrate';

describe('Migration', () => {
  describe('packageJson patch', () => {
    it('should throw an error when the target package is not available', async () => {
      const migrator = new Migrator({
        versions: () => null,
        fetch: (p, v) => {
          throw new Error('cannot fetch');
        },
        from: {},
        to: {}
      });

      try {
        await migrator.updatePackageJson('mypackage', 'myversion');
        throw new Error('fail');
      } catch (e) {
        expect(e.message).toEqual(`cannot fetch`);
      }
    });

    it('should return a patch to the new version', async () => {
      const migrator = new Migrator({
        versions: () => '1.0.0',
        fetch: (p, v) => Promise.resolve({ version: '2.0.0' }),
        from: {},
        to: {}
      });

      expect(await migrator.updatePackageJson('mypackage', '2.0.0')).toEqual({
        migrations: [],
        packageJson: {
          mypackage: { version: '2.0.0', alwaysAddToPackageJson: false }
        }
      });
    });

    it('should collect the information recursively from upserts', async () => {
      const migrator = new Migrator({
        versions: () => '1.0.0',
        fetch: (p, v) => {
          if (p === 'parent') {
            return Promise.resolve({
              version: '2.0.0',
              packageJsonUpdates: {
                version2: {
                  version: '2.0.0',
                  packages: {
                    child: { version: '2.0.0' },
                    newChild: { version: '3.0.0', alwaysAddToPackageJson: true }
                  }
                }
              },
              schematics: {}
            });
          } else if (p === 'child') {
            return Promise.resolve({ version: '2.0.0' });
          } else if (p === 'newChild') {
            return Promise.resolve({ version: '2.0.0' });
          } else {
            return Promise.resolve(null);
          }
        },
        from: {},
        to: {}
      });

      expect(await migrator.updatePackageJson('parent', '2.0.0')).toEqual({
        migrations: [],
        packageJson: {
          parent: { version: '2.0.0', alwaysAddToPackageJson: false },
          child: { version: '2.0.0', alwaysAddToPackageJson: false },
          newChild: { version: '2.0.0', alwaysAddToPackageJson: true }
        }
      });
    });

    it('should stop recursive calls when exact version', async () => {
      const migrator = new Migrator({
        versions: () => '1.0.0',
        fetch: (p, v) => {
          if (p === 'parent') {
            return Promise.resolve({
              version: '2.0.0',
              packageJsonUpdates: {
                version2: {
                  version: '2.0.0',
                  packages: {
                    child: { version: '2.0.0' }
                  }
                }
              },
              schematics: {}
            });
          } else if (p === 'child') {
            return Promise.resolve({
              version: '2.0.0',
              packageJsonUpdates: {
                version2: {
                  version: '2.0.0',
                  packages: {
                    parent: { version: '2.0.0' }
                  }
                }
              },
              schematics: {}
            });
          } else {
            return Promise.resolve(null);
          }
        },
        from: {},
        to: {}
      });

      expect(await migrator.updatePackageJson('parent', '2.0.0')).toEqual({
        migrations: [],
        packageJson: {
          parent: { version: '2.0.0', alwaysAddToPackageJson: false },
          child: { version: '2.0.0', alwaysAddToPackageJson: false }
        }
      });
    });

    it('should set the version of a dependency to the newest', async () => {
      const migrator = new Migrator({
        versions: () => '1.0.0',
        fetch: (p, v) => {
          if (p === 'parent') {
            return Promise.resolve({
              version: '2.0.0',
              packageJsonUpdates: {
                version2: {
                  version: '2.0.0',
                  packages: {
                    child1: { version: '2.0.0' },
                    child2: { version: '2.0.0' }
                  }
                }
              },
              schematics: {}
            });
          } else if (p === 'child1') {
            return Promise.resolve({
              version: '2.0.0',
              packageJsonUpdates: {
                version2: {
                  version: '2.0.0',
                  packages: {
                    grandchild: { version: '3.0.0' }
                  }
                }
              },
              schematics: {}
            });
          } else if (p === 'child2') {
            return Promise.resolve({
              version: '2.0.0',
              packageJsonUpdates: {
                version2: {
                  version: '2.0.0',
                  packages: {
                    grandchild: { version: '4.0.0' }
                  }
                }
              },
              schematics: {}
            });
          } else {
            return Promise.resolve({ version: '4.0.0' });
          }
        },
        from: {},
        to: {}
      });

      expect(await migrator.updatePackageJson('parent', '2.0.0')).toEqual({
        migrations: [],
        packageJson: {
          parent: { version: '2.0.0', alwaysAddToPackageJson: false },
          child1: { version: '2.0.0', alwaysAddToPackageJson: false },
          child2: { version: '2.0.0', alwaysAddToPackageJson: false },
          grandchild: { version: '4.0.0', alwaysAddToPackageJson: false }
        }
      });
    });

    it('should skip the versions <= currently installed', async () => {
      const migrator = new Migrator({
        versions: () => '1.0.0',
        fetch: (p, v) => {
          if (p === 'parent') {
            return Promise.resolve({
              version: '2.0.0',
              packageJsonUpdates: {
                version2: {
                  version: '2.0.0',
                  packages: {
                    child: { version: '2.0.0' }
                  }
                }
              },
              schematics: {}
            });
          } else if (p === 'child') {
            return Promise.resolve({
              version: '2.0.0',
              packageJsonUpdates: {
                version2: {
                  version: '1.0.0',
                  packages: {
                    grandchild: { version: '2.0.0' }
                  }
                }
              },
              schematics: {}
            });
          } else {
            return Promise.resolve({ version: '2.0.0' });
          }
        },
        from: {},
        to: {}
      });

      expect(await migrator.updatePackageJson('parent', '2.0.0')).toEqual({
        migrations: [],
        packageJson: {
          parent: { version: '2.0.0', alwaysAddToPackageJson: false },
          child: { version: '2.0.0', alwaysAddToPackageJson: false }
        }
      });
    });

    it('should conditionally process packages if they are installed', async () => {
      const migrator = new Migrator({
        versions: p => (p !== 'not-installed' ? '1.0.0' : null),
        fetch: (p, v) => {
          if (p === 'parent') {
            return Promise.resolve({
              version: '2.0.0',
              packageJsonUpdates: {
                version2: {
                  version: '2.0.0',
                  packages: {
                    child1: { version: '2.0.0', ifPackageInstalled: 'other' },
                    child2: {
                      version: '2.0.0',
                      ifPackageInstalled: 'not-installed'
                    }
                  }
                }
              },
              schematics: {}
            });
          } else if (p === 'child1') {
            return Promise.resolve({ version: '2.0.0' });
          } else if (p === 'child2') {
            throw new Error('should not be processed');
          } else {
            return Promise.resolve(null);
          }
        },
        from: {},
        to: {}
      });

      expect(await migrator.updatePackageJson('parent', '2.0.0')).toEqual({
        migrations: [],
        packageJson: {
          parent: { version: '2.0.0', alwaysAddToPackageJson: false },
          child1: { version: '2.0.0', alwaysAddToPackageJson: false }
        }
      });
    });

    // this is temporary. if tao gets used by other projects,
    // we will extract the special casing
    it('should special case @nrwl/workspace', async () => {
      const migrator = new Migrator({
        versions: () => '1.0.0',
        fetch: (p, v) => Promise.resolve({ version: '2.0.0' }),
        from: {},
        to: {}
      });

      expect(
        await migrator.updatePackageJson('@nrwl/workspace', '2.0.0')
      ).toEqual({
        migrations: [],
        packageJson: {
          '@nrwl/workspace': {
            version: '2.0.0',
            alwaysAddToPackageJson: false
          },
          '@nrwl/angular': { version: '2.0.0', alwaysAddToPackageJson: false },
          '@nrwl/cypress': { version: '2.0.0', alwaysAddToPackageJson: false },
          '@nrwl/eslint-plugin-nx': {
            version: '2.0.0',
            alwaysAddToPackageJson: false
          },
          '@nrwl/express': { version: '2.0.0', alwaysAddToPackageJson: false },
          '@nrwl/jest': { version: '2.0.0', alwaysAddToPackageJson: false },
          '@nrwl/linter': { version: '2.0.0', alwaysAddToPackageJson: false },
          '@nrwl/nest': { version: '2.0.0', alwaysAddToPackageJson: false },
          '@nrwl/next': { version: '2.0.0', alwaysAddToPackageJson: false },
          '@nrwl/node': { version: '2.0.0', alwaysAddToPackageJson: false },
          '@nrwl/react': { version: '2.0.0', alwaysAddToPackageJson: false },
          '@nrwl/tao': { version: '2.0.0', alwaysAddToPackageJson: false },
          '@nrwl/web': { version: '2.0.0', alwaysAddToPackageJson: false }
        }
      });
    });
  });

  describe('migrations', () => {
    it('should create a list of migrations to run', async () => {
      const migrator = new Migrator({
        versions: p => {
          if (p === 'parent') return '1.0.0';
          if (p === 'child') return '1.0.0';
          return null;
        },
        fetch: (p, v) => {
          if (p === 'parent') {
            return Promise.resolve({
              version: '2.0.0',
              packageJsonUpdates: {
                version2: {
                  version: '2.0.0',
                  packages: {
                    child: { version: '2.0.0' },
                    newChild: {
                      version: '3.0.0'
                    }
                  }
                }
              },
              schematics: {
                version2: {
                  version: '2.0.0',
                  factory: 'parent-factory'
                }
              }
            });
          } else if (p === 'child') {
            return Promise.resolve({
              version: '2.0.0',
              schematics: {
                version2: {
                  version: '2.0.0',
                  factory: 'child-factory'
                }
              }
            });
          } else if (p === 'newChild') {
            return Promise.resolve({
              version: '3.0.0',
              schematics: {
                version2: {
                  version: '2.0.0',
                  factory: 'new-child-factory'
                }
              }
            });
          } else {
            return Promise.resolve(null);
          }
        },
        from: {},
        to: {}
      });
      expect(await migrator.updatePackageJson('parent', '2.0.0')).toEqual({
        migrations: [
          {
            package: 'parent',
            version: '2.0.0',
            name: 'version2',
            factory: 'parent-factory'
          },
          {
            package: 'child',
            version: '2.0.0',
            name: 'version2',
            factory: 'child-factory'
          }
        ],
        packageJson: {
          parent: { version: '2.0.0', alwaysAddToPackageJson: false },
          child: { version: '2.0.0', alwaysAddToPackageJson: false },
          newChild: { version: '3.0.0', alwaysAddToPackageJson: false }
        }
      });
    });
  });
});
