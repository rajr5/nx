import { Tree } from '@angular-devkit/schematics';
import {
  SchematicTestRunner,
  UnitTestTree
} from '@angular-devkit/schematics/testing';

import * as path from 'path';

import { serializeJson } from '../../src/utils/fileutils';
import { readJsonInTree, updateJsonInTree } from '../../src/utils/ast-utils';

import { stripIndents } from '@angular-devkit/core/src/utils/literals';

const effectContents = `
import { Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { Effect, Actions } from '@ngrx/effects';
import { DataPersistence } from '@nrwl/nx';

import { UserPartialState } from './user.reducer';
import {
  LoadUser,
  UserLoaded,
  UserLoadError,
  UserActionTypes
} from './user.actions';

@Injectable()
export class UserEffects {
  @Effect() effect$ = this.actions$.ofType(LoadUser).pipe(mapTo(UserLoaded));
  @Effect() effect2$ = this.actions$.ofType<UserLoaded>(LoadUser).pipe(mapTo(UserLoaded));
  @Effect() effect3$ = this.actions$.ofType<UserLoaded>(LoadUser).pipe(withLatestFrom(this.store.select(selector)), mapTo(UserLoaded));

  constructor(
    private actions$: Actions,
    private dataPersistence: DataPersistence<UserPartialState>,
    private store: Store<AppState>
  ) {}
}

`;

const selectorContents = `
import { Store } from '@ngrx/store';
import { Component } from '@angular/core';
import { AppState, selector } from '../+state';

@Component({
  selector: 'app',
  template: '',
  styles: []
})
export class AppComponent {
  slice$ = this.store.select(selector).pipe(
    map(a => a)
  );

  slice2$: Observable<string>;

  slice3$ = Observable.from([]).pipe(
    withLatestFrom(this.store.select(selector5))
  );

  constructor(
    private store: Store<AppState>
  ) {}

  ngOnInit() {
    this.slice2$ = this.store.select(selector2);
    this.store.select(selector3).subscribe(console.log);
  }
}

`;

describe('Update 7.6.0', () => {
  let initialTree: Tree;
  let schematicRunner: SchematicTestRunner;

  beforeEach(() => {
    initialTree = new UnitTestTree(Tree.empty());

    initialTree.create(
      'package.json',
      serializeJson({
        dependencies: {
          '@ngrx/effects': '6.1.2',
          '@ngrx/router-store': '6.1.2',
          '@ngrx/store': '6.1.2'
        },
        devDependencies: {
          '@ngrx/schematics': '6.1.2',
          '@ngrx/store-devtools': '6.1.2'
        }
      })
    );

    schematicRunner = new SchematicTestRunner(
      '@nrwl/schematics',
      path.join(__dirname, '../migrations.json')
    );
  });

  describe('VSCode Extension Recommendations', () => {
    it('should be added', async () => {
      const result = await schematicRunner
        .runSchematicAsync('update-7.6.0', {}, initialTree)
        .toPromise();

      expect(readJsonInTree(result, '.vscode/extensions.json')).toEqual({
        recommendations: [
          'nrwl.angular-console',
          'angular.ng-template',
          'esbenp.prettier-vscode'
        ]
      });
    });

    it('should be added to existing recommendations', async () => {
      initialTree = await schematicRunner
        .callRule(
          updateJsonInTree('.vscode/extensions.json', () => ({
            recommendations: ['eamodio.gitlens', 'angular.ng-template']
          })),
          initialTree
        )
        .toPromise();

      const result = await schematicRunner
        .runSchematicAsync('update-7.6.0', {}, initialTree)
        .toPromise();

      expect(readJsonInTree(result, '.vscode/extensions.json')).toEqual({
        recommendations: [
          'eamodio.gitlens',
          'angular.ng-template',
          'nrwl.angular-console',
          'esbenp.prettier-vscode'
        ]
      });
    });
  });

  describe('NgRx Migration', () => {
    it('should update ngrx to 7.1.0', async () => {
      const result = await schematicRunner
        .runSchematicAsync('update-7.6.0', {}, initialTree)
        .toPromise();

      expect(readJsonInTree(result, 'package.json')).toEqual({
        dependencies: {
          '@ngrx/effects': '7.2.0',
          '@ngrx/router-store': '7.2.0',
          '@ngrx/store': '7.2.0'
        },
        devDependencies: {
          '@ngrx/schematics': '7.2.0',
          '@ngrx/store-devtools': '7.2.0'
        }
      });
    });

    it('should convert ofType code', async () => {
      initialTree.create('user.effects.ts', effectContents);
      const result = await schematicRunner
        .runSchematicAsync('update-7.6.0', {}, initialTree)
        .toPromise();
      const contents = result.readContent('user.effects.ts');
      expect(contents).toContain(
        "import { Effect, Actions, ofType } from '@ngrx/effects';"
      );
      expect(stripIndents`${contents}`).toContain(
        stripIndents`
          @Effect() effect$ = this.actions$.pipe(
            ofType(LoadUser),
            mapTo(UserLoaded)
          );`
      );
      expect(stripIndents`${contents}`).toContain(
        stripIndents`
          @Effect() effect2$ = this.actions$.pipe(
            ofType<UserLoaded>(LoadUser),
            mapTo(UserLoaded)
          );`
      );
      expect(stripIndents`${contents}`).toContain(
        stripIndents`
          @Effect() effect3$ = this.actions$.pipe(
            ofType<UserLoaded>(LoadUser),
            withLatestFrom(this.store.pipe(select(selector))),
            mapTo(UserLoaded)
          );`
      );
    });

    it('should convert select code', async () => {
      initialTree.create('app.component.ts', selectorContents);
      const result = await schematicRunner
        .runSchematicAsync('update-7.6.0', {}, initialTree)
        .toPromise();
      const contents = result.readContent('app.component.ts');
      expect(contents).toContain(
        "import { Store, select } from '@ngrx/store';"
      );
      expect(stripIndents`${contents}`).toContain(
        stripIndents`
          slice$ = this.store.pipe(
            select(selector),
            map(a => a)
          );`
      );
      expect(contents).toContain(
        'this.slice2$ = this.store.pipe(select(selector2))'
      );
      expect(contents).toContain(
        'this.store.pipe(select(selector3)).subscribe(console.log);'
      );

      expect(stripIndents`${contents}`).toContain(stripIndents`
        slice3$ = Observable.from([]).pipe(
          withLatestFrom(this.store.pipe(select(selector5)))
        );`);
    });
  });
});
