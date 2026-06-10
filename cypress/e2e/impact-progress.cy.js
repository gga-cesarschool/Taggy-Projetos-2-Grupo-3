const {
  calcularCenario,
  selectScenario,
  STORAGE_KEY,
} = require('../support/taggy-test-helpers');

describe('Meu Impacto', () => {
  beforeEach(() => {
    cy.visit('/', {
      onBeforeLoad(win) {
        win.localStorage.removeItem(STORAGE_KEY);
      },
    });
  });

  it('acumula pontos e persiste o perfil do usuário após simulações', () => {
    cy.contains('.calc-group__label', 'FREQUÊNCIA MENSAL').should('be.visible');
    cy.contains('.calc-group__label', 'NÚMERO DE PASSAGENS').should('be.visible');

    const primeira = calcularCenario({
      veiculo: 'Carro Elétrico',
      contexto: 'Estacionamento',
      freq: 2,
      passagens: 2,
    });

    selectScenario({
      veiculo: 'Carro Elétrico',
      contexto: 'Estacionamento',
      freq: 2,
      passagens: 2,
    });

    cy.window().then((win) => {
      const profile = JSON.parse(win.localStorage.getItem(STORAGE_KEY));

      expect(profile.totalPoints).to.eq(primeira.pontos);
      expect(profile.totalPassagens).to.eq(primeira.totalPassagens);
      expect(profile.totalCo2Evitado).to.eq(primeira.evitado);
      expect(profile.lastPoints).to.eq(primeira.pontos);
      expect(profile.lastPassagens).to.eq(primeira.totalPassagens);
      expect(profile.lastCo2Evitado).to.eq(primeira.evitado);
    });

    cy.get('#result-evitado').should('have.text', primeira.evitadoFormatado.valor);
    cy.get('#result-evitado-unit').should('have.text', primeira.evitadoFormatado.unidade);
    cy.get('#result-sem').should('have.text', primeira.semFormatado.valor);
    cy.get('#result-com').should('have.text', primeira.comFormatado.valor);
    cy.get('#result-evitado-desc').should('contain.text', 'Equivale a');

    cy.reload();
    cy.get('#result-evitado').should('have.text', primeira.evitadoFormatado.valor);

    const segunda = calcularCenario({
      veiculo: 'Carro Combustão',
      contexto: 'Pedágio',
      freq: 10,
      passagens: 20,
    });

    selectScenario({
      veiculo: 'Carro Combustão',
      contexto: 'Pedágio',
      freq: 10,
      passagens: 20,
    });

    cy.window().then((win) => {
      const profile = JSON.parse(win.localStorage.getItem(STORAGE_KEY));
      const expectedTotalPoints = primeira.pontos + segunda.pontos;
      const expectedTotalPassagens = primeira.totalPassagens + segunda.totalPassagens;
      const expectedTotalCo2 = primeira.evitado + segunda.evitado;

      expect(profile.totalPoints).to.eq(expectedTotalPoints);
      expect(profile.totalPassagens).to.eq(expectedTotalPassagens);
      expect(profile.totalCo2Evitado).to.eq(expectedTotalCo2);
      expect(profile.lastPoints).to.eq(segunda.pontos);
      expect(profile.lastPassagens).to.eq(segunda.totalPassagens);
      expect(profile.lastCo2Evitado).to.eq(segunda.evitado);
    });

    cy.get('#result-evitado').should('have.text', segunda.evitadoFormatado.valor);
    cy.get('#result-evitado-unit').should('have.text', segunda.evitadoFormatado.unidade);
    cy.get('#result-sem').should('have.text', segunda.semFormatado.valor);
    cy.get('#result-com').should('have.text', segunda.comFormatado.valor);
    cy.get('#result-evitado-desc').should('not.be.empty');

    cy.window().then((win) => {
      const profile = JSON.parse(win.localStorage.getItem(STORAGE_KEY));
      expect(profile.totalPoints).to.be.greaterThan(0);
    });
  });
});
