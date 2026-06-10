describe('Metodologia', () => {
  beforeEach(() => {
    cy.visit('/metodologia/');
  });

  it('mostra a explicação e a comparação entre os cenários', () => {
    cy.get('.methodology').should('be.visible');
    cy.get('.methodology-hero').should('be.visible');
    cy.contains('.methodology-hero__title', 'Entenda como calculamos as emissões evitadas').should('be.visible');
    cy.contains('.methodology-hero__subtitle', 'Comparamos o fluxo tradicional com o fluxo automático').should('be.visible');

    cy.get('.comparison-section').should('be.visible');
    cy.get('.comparison-card--danger').within(() => {
      cy.contains('SEM Taggy').should('be.visible');
      cy.contains('Fila de 3 a 5 minutos').should('be.visible');
      cy.contains('Impressão de ticket de papel').should('be.visible');
    });

    cy.get('.comparison-card--success').within(() => {
      cy.contains('COM Taggy').should('be.visible');
      cy.contains('Passagem automática').should('be.visible');
      cy.contains('Comprovante digital').should('be.visible');
    });
  });
});
