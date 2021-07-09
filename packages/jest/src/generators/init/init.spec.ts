import { readJson, Tree, writeJson } from '@nrwl/devkit';
import { createTreeWithEmptyWorkspace } from '@nrwl/devkit/testing';
import { jestInitGenerator } from './init';

describe('jest', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
  });

  it('should generate files', async () => {
    jestInitGenerator(tree, {});

    expect(tree.exists('jest.config.js')).toBeTruthy();
    expect(tree.read('jest.config.js', 'utf-8')).toMatchInlineSnapshot(`
      "const { getJestProjects } = require('@nrwl/jest');
      
      module.exports = {
      projects: getJestProjects()
      };"
    `);
  });

  it('should not override existing files', async () => {
    tree.write('jest.config.js', `test`);
    jestInitGenerator(tree, {});
    expect(tree.read('jest.config.js', 'utf-8')).toEqual('test');
  });

  it('should add dependencies', async () => {
    jestInitGenerator(tree, {});
    const packageJson = readJson(tree, 'package.json');
    expect(packageJson.devDependencies.jest).toBeDefined();
    expect(packageJson.devDependencies['@nrwl/jest']).toBeDefined();
    expect(packageJson.devDependencies['@types/jest']).toBeDefined();
    expect(packageJson.devDependencies['ts-jest']).toBeDefined();
  });

  describe('--babelJest', () => {
    it('should add babel dependencies', async () => {
      jestInitGenerator(tree, { babelJest: true });
      const packageJson = readJson(tree, 'package.json');
      expect(packageJson.devDependencies['@babel/core']).toBeDefined();
      expect(packageJson.devDependencies['@babel/preset-env']).toBeDefined();
      expect(
        packageJson.devDependencies['@babel/preset-typescript']
      ).toBeDefined();
      expect(packageJson.devDependencies['@babel/preset-react']).toBeDefined();
      expect(packageJson.devDependencies['babel-jest']).toBeDefined();
    });
  });

  describe('adds jest extension', () => {
    beforeEach(async () => {
      writeJson(tree, '.vscode/extensions.json', {
        recommendations: [
          'nrwl.angular-console',
          'angular.ng-template',
          'dbaeumer.vscode-eslint',
          'esbenp.prettier-vscode',
        ],
      });
    });

    it('should add the jest extension to the recommended property', async () => {
      jestInitGenerator(tree, {});
      const extensionsJson = readJson(tree, '.vscode/extensions.json');
      expect(extensionsJson).toMatchInlineSnapshot(`
        Object {
          "recommendations": Array [
            "nrwl.angular-console",
            "angular.ng-template",
            "dbaeumer.vscode-eslint",
            "esbenp.prettier-vscode",
            "firsttris.vscode-jest-runner",
          ],
        }
      `);
    });
  });
});
