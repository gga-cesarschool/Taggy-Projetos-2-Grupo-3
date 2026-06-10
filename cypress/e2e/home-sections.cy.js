describe('Home', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('mostra as seções principais da página', () => {
    cy.get('.hero').should('be.visible').and('contain.text', 'Taggy');
    cy.get('.hero__title').should('be.visible').and('contain.text', 'CO');

    cy.get('.calc-section').should('be.visible');
    cy.get('.calc-section__title').should('contain.text', 'Calcule suas emissões evitadas');

    cy.get('.reduce-section').should('be.visible');
    cy.get('.impact-section').should('be.visible').and('contain.text', 'Impacto em números reais');
    cy.get('.cta-section').should('be.visible').and('contain.text', 'Relatórios ESG para empresas');
    cy.get('.faq-section').should('be.visible').and('contain.text', 'Perguntas frequentes');

    cy.contains('.nav__link', 'Home').should('have.class', 'nav__link--active');
    cy.contains('.nav__link', 'Calculadora').should('be.visible');
    cy.contains('.nav__link', 'Meu Impacto').should('be.visible');
    cy.contains('.nav__link', 'Metodologia').should('be.visible');
    cy.contains('.nav__link', 'FAQ').should('be.visible');
    cy.contains('.nav__link', 'Empresas').should('be.visible');
  });

  it('controla o FAQ e destaca a área de empresas', () => {
    cy.get('.faq-section').within(() => {
      cy.get('.faq-item').should('have.length', 4);
      cy.get('.faq-item').eq(0).find('.faq-item__btn').should('have.attr', 'aria-expanded', 'true');

      cy.get('.faq-item').eq(1).find('.faq-item__btn').click();
      cy.get('.faq-item').eq(1).find('.faq-item__btn').should('have.attr', 'aria-expanded', 'true');
      cy.get('.faq-item').eq(0).find('.faq-item__btn').should('have.attr', 'aria-expanded', 'false');

      cy.contains('Como o cálculo é feito?').click();
      cy.contains('GHG Protocol Brasil 2023').should('be.visible');
    });

    cy.get('.cta-card--dark').should('be.visible').and('contain.text', 'Relatórios ESG para empresas');
    cy.get('.footer__col-title').contains('EMPRESAS').should('be.visible');
    cy.get('.footer__links').contains('Área B2B').should('be.visible');
    cy.get('.footer__links').contains('Wrapped Corporativo').should('be.visible');
    cy.get('.footer__links').contains('Relatórios ESG').should('be.visible');
  });
});
