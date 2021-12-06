import { addProjectConfiguration } from '@nrwl/devkit';
import { wrapAngularDevkitSchematic } from '@nrwl/devkit/ngcli-adapter';
import { createTreeWithEmptyWorkspace } from '@nrwl/devkit/testing';
import { createScam } from './create-module';
describe('Create module in the tree', () => {
  it('should create the scam inline correctly', async () => {
    // ARRANGE
    const tree = createTreeWithEmptyWorkspace(2);
    addProjectConfiguration(tree, 'app1', {
      projectType: 'application',
      sourceRoot: 'apps/app1/src',
      root: 'apps/app1',
    });

    const angularComponentSchematic = wrapAngularDevkitSchematic(
      '@schematics/angular',
      'component'
    );
    await angularComponentSchematic(tree, {
      name: 'example',
      project: 'app1',
      skipImport: true,
      export: false,
    });

    // ACT
    createScam(tree, {
      name: 'example',
      project: 'app1',
      inlineScam: true,
    });

    // ASSERT
    const componentSource = tree.read(
      'apps/app1/src/app/example/example.component.ts',
      'utf-8'
    );
    expect(componentSource).toMatchInlineSnapshot(`
      "import { Component, OnInit, NgModule } from '@angular/core';
      import { CommonModule } from '@angular/common';

      @Component({
        selector: 'example',
        templateUrl: './example.component.html',
        styleUrls: ['./example.component.css']
      })
      export class ExampleComponent implements OnInit {

        constructor() { }

        ngOnInit(): void {
        }

      }

      @NgModule({
        imports: [CommonModule],
        declarations: [ExampleComponent],
        exports: [ExampleComponent],
      })
      export class ExampleComponentModule {}"
    `);
  });

  it('should create the scam separately correctly', async () => {
    // ARRANGE
    const tree = createTreeWithEmptyWorkspace(2);
    addProjectConfiguration(tree, 'app1', {
      projectType: 'application',
      sourceRoot: 'apps/app1/src',
      root: 'apps/app1',
    });

    const angularComponentSchematic = wrapAngularDevkitSchematic(
      '@schematics/angular',
      'component'
    );
    await angularComponentSchematic(tree, {
      name: 'example',
      project: 'app1',
      skipImport: true,
      export: false,
    });

    // ACT
    createScam(tree, {
      name: 'example',
      project: 'app1',
      inlineScam: false,
    });

    // ASSERT
    const componentModuleSource = tree.read(
      'apps/app1/src/app/example/example.module.ts',
      'utf-8'
    );
    expect(componentModuleSource).toMatchInlineSnapshot(`
      "import { NgModule } from '@angular/core';
      import { CommonModule } from '@angular/common';
      import { ExampleComponent } from './example.component.ts';

      @NgModule({
        imports: [CommonModule],
        declarations: [ExampleComponent],
        exports: [ExampleComponent],
      })
      export class ExampleComponentModule {}"
    `);
  });

  it('should create the scam inline correctly when --flat', async () => {
    // ARRANGE
    const tree = createTreeWithEmptyWorkspace(2);
    addProjectConfiguration(tree, 'app1', {
      projectType: 'application',
      sourceRoot: 'apps/app1/src',
      root: 'apps/app1',
    });

    const angularComponentSchematic = wrapAngularDevkitSchematic(
      '@schematics/angular',
      'component'
    );
    await angularComponentSchematic(tree, {
      name: 'example',
      project: 'app1',
      skipImport: true,
      export: false,
      flat: true,
    });

    // ACT
    createScam(tree, {
      name: 'example',
      project: 'app1',
      inlineScam: true,
      flat: true,
    });

    // ASSERT
    const componentSource = tree.read(
      'apps/app1/src/app/example.component.ts',
      'utf-8'
    );
    expect(componentSource).toMatchInlineSnapshot(`
      "import { Component, OnInit, NgModule } from '@angular/core';
      import { CommonModule } from '@angular/common';

      @Component({
        selector: 'example',
        templateUrl: './example.component.html',
        styleUrls: ['./example.component.css']
      })
      export class ExampleComponent implements OnInit {

        constructor() { }

        ngOnInit(): void {
        }

      }

      @NgModule({
        imports: [CommonModule],
        declarations: [ExampleComponent],
        exports: [ExampleComponent],
      })
      export class ExampleComponentModule {}"
    `);
  });

  it('should create the scam separately correctly when --flat', async () => {
    // ARRANGE
    const tree = createTreeWithEmptyWorkspace(2);
    addProjectConfiguration(tree, 'app1', {
      projectType: 'application',
      sourceRoot: 'apps/app1/src',
      root: 'apps/app1',
    });

    const angularComponentSchematic = wrapAngularDevkitSchematic(
      '@schematics/angular',
      'component'
    );
    await angularComponentSchematic(tree, {
      name: 'example',
      project: 'app1',
      skipImport: true,
      export: false,
      flat: true,
    });

    // ACT
    createScam(tree, {
      name: 'example',
      project: 'app1',
      inlineScam: false,
      flat: true,
    });

    // ASSERT
    const componentModuleSource = tree.read(
      'apps/app1/src/app/example.module.ts',
      'utf-8'
    );
    expect(componentModuleSource).toMatchInlineSnapshot(`
      "import { NgModule } from '@angular/core';
      import { CommonModule } from '@angular/common';
      import { ExampleComponent } from './example.component.ts';

      @NgModule({
        imports: [CommonModule],
        declarations: [ExampleComponent],
        exports: [ExampleComponent],
      })
      export class ExampleComponentModule {}"
    `);
  });

  it('should create the scam inline correctly when --type', async () => {
    // ARRANGE
    const tree = createTreeWithEmptyWorkspace(2);
    addProjectConfiguration(tree, 'app1', {
      projectType: 'application',
      sourceRoot: 'apps/app1/src',
      root: 'apps/app1',
    });

    const angularComponentSchematic = wrapAngularDevkitSchematic(
      '@schematics/angular',
      'component'
    );
    await angularComponentSchematic(tree, {
      name: 'example',
      project: 'app1',
      skipImport: true,
      export: false,
      flat: true,
      type: 'random',
    });

    // ACT
    createScam(tree, {
      name: 'example',
      project: 'app1',
      inlineScam: true,
      flat: true,
      type: 'random',
    });

    // ASSERT
    const componentSource = tree.read(
      'apps/app1/src/app/example.random.ts',
      'utf-8'
    );
    expect(componentSource).toMatchInlineSnapshot(`
      "import { Component, OnInit, NgModule } from '@angular/core';
      import { CommonModule } from '@angular/common';

      @Component({
        selector: 'example',
        templateUrl: './example.random.html',
        styleUrls: ['./example.random.css']
      })
      export class ExampleRandom implements OnInit {

        constructor() { }

        ngOnInit(): void {
        }

      }

      @NgModule({
        imports: [CommonModule],
        declarations: [ExampleRandom],
        exports: [ExampleRandom],
      })
      export class ExampleRandomModule {}"
    `);
  });

  it('should create the scam separately correctly when --type', async () => {
    // ARRANGE
    const tree = createTreeWithEmptyWorkspace(2);
    addProjectConfiguration(tree, 'app1', {
      projectType: 'application',
      sourceRoot: 'apps/app1/src',
      root: 'apps/app1',
    });

    const angularComponentSchematic = wrapAngularDevkitSchematic(
      '@schematics/angular',
      'component'
    );
    await angularComponentSchematic(tree, {
      name: 'example',
      project: 'app1',
      skipImport: true,
      export: false,
      flat: true,
      type: 'random',
    });

    // ACT
    createScam(tree, {
      name: 'example',
      project: 'app1',
      inlineScam: false,
      flat: true,
      type: 'random',
    });

    // ASSERT
    const componentModuleSource = tree.read(
      'apps/app1/src/app/example.module.ts',
      'utf-8'
    );
    expect(componentModuleSource).toMatchInlineSnapshot(`
      "import { NgModule } from '@angular/core';
      import { CommonModule } from '@angular/common';
      import { ExampleRandom } from './example.random.ts';

      @NgModule({
        imports: [CommonModule],
        declarations: [ExampleRandom],
        exports: [ExampleRandom],
      })
      export class ExampleRandomModule {}"
    `);
  });
});
