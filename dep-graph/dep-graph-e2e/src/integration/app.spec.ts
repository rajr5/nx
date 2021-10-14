import {
  getCheckedProjectItems,
  getDeselectAllButton,
  getIncludeProjectsInPathButton,
  getProjectItems,
  getSelectAllButton,
  getSelectProjectsMessage,
  getTextFilterInput,
  getUncheckedProjectItems,
  getUnfocusProjectButton,
} from '../support/app.po';

describe('dep-graph-client', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.get('[data-cy=project-select]').select('Nx');
  });

  it('should display message to select projects', () => {
    getSelectProjectsMessage().should('be.visible');
  });

  it('should hide select projects message when a project is selected', () => {
    cy.contains('nx-dev').scrollIntoView().should('be.visible');
    cy.get('[data-project="nx-dev"]').should('be.visible');
    cy.get('[data-project="nx-dev"]').click({ force: true });
    getSelectProjectsMessage().should('not.be.visible');
  });

  describe('selecting a different project', () => {
    it('should change the available projects', () => {
      getProjectItems().should('have.length', 55);
      cy.get('[data-cy=project-select]').select('Ocean', { force: true });
      getProjectItems().should('have.length', 124);
    });
  });

  describe('select all button', () => {
    it('should check all project items', () => {
      getSelectAllButton().scrollIntoView().click({ force: true });
      getCheckedProjectItems().should('have.length', 55);
    });
  });

  describe('deselect all button', () => {
    it('should uncheck all project items', () => {
      getDeselectAllButton().click();
      getUncheckedProjectItems().should('have.length', 55);
      getSelectProjectsMessage().should('be.visible');
    });
  });

  xdescribe('focusing projects in sidebar', () => {
    it('should select appropriate projects', () => {
      cy.contains('nx-dev').scrollIntoView().should('be.visible');
      cy.get('[data-project="nx-dev"]').prev('button').click({ force: true });

      cy.get('[data-project="nx-dev"]').should('have.attr', 'active', 'true');
    });
  });

  xdescribe('unfocus button', () => {
    it('should uncheck all project items', () => {
      cy.get('[data-project="nx-dev"]').prev('button').click({ force: true });
      getUnfocusProjectButton().click();

      getUncheckedProjectItems().should('have.length', 55);
    });
  });

  describe('text filtering', () => {
    it('should filter projects by text when pressing enter', () => {
      getTextFilterInput().type('nx-dev{enter}');

      getCheckedProjectItems().should('have.length', 9);
    });

    it('should include projects in path when option is checked', () => {
      getTextFilterInput().type('nx-dev');
      getIncludeProjectsInPathButton().click();

      getCheckedProjectItems().should('have.length', 17);
    });
  });
});
