describe('Empresas', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('abre a seção Empresas e valida os links clicáveis da área corporativa', () => {
    cy.contains('.nav__link', 'Empresas')
      .should('have.attr', 'href', '#')
      .click();

    cy.location('pathname').should('eq', '/');

    cy.get('.cta-card--dark')
      .scrollIntoView()
      .should('be.visible');
    cy.contains('.cta-card--dark .cta-card__title', 'Relatórios ESG para empresas').should('be.visible');
    cy.contains('.cta-card--dark .cta-card__desc', 'indicadores por estado').should('be.visible');

    cy.contains('.cta-card--dark a.btn--cta-blue', 'Área Empresa')
      .should('have.attr', 'href', '#')
      .click();

    cy.get('.footer__col-title').contains('EMPRESAS').should('be.visible');
    cy.contains('.footer__links a', 'Área B2B').should('have.attr', 'href', '#').click();
    cy.contains('.footer__links a', 'Wrapped Corporativo').should('have.attr', 'href', '#').click();
    cy.contains('.footer__links a', 'Relatórios ESG').should('have.attr', 'href', '#').click();
  });
});
