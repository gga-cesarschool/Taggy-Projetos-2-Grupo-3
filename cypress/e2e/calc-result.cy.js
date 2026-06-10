const {
  calcularCenario,
  selectScenario,
} = require('../support/taggy-test-helpers');

function verificarCenario(cenario) {
  const esperado = calcularCenario(cenario);

  selectScenario(cenario);

  cy.get('#freq-val').should('have.text', esperado.freqLabel);
  cy.get('#pass-val').should('have.text', esperado.passLabel);

  cy.get('#result-evitado').should('have.text', esperado.evitadoFormatado.valor);
  cy.get('#result-evitado-unit').should('have.text', esperado.evitadoFormatado.unidade);
  cy.get('#result-sem').should('have.text', esperado.semFormatado.valor);
  cy.get('#result-sem-unit').should('have.text', esperado.semFormatado.unidade);
  cy.get('#result-com').should('have.text', esperado.comFormatado.valor);
  cy.get('#result-com-unit').should('have.text', esperado.comFormatado.unidade);
  cy.get('#result-evitado-desc').should('have.text', esperado.descricao);
}

describe('Calculadora', () => {
  beforeEach(() => {
    cy.visit('/', {
      onBeforeLoad(win) {
        win.localStorage.removeItem('taggy:impact-profile-v2');
      },
    });
  });

  it('calcula valores em g, kg e t conforme cenário selecionado', () => {
    verificarCenario({
      veiculo: 'Carro Elétrico',
      contexto: 'Estacionamento',
      freq: 2,
      passagens: 2,
    });

    verificarCenario({
      veiculo: 'Moto',
      contexto: 'Acesso Controlado',
      freq: 10,
      passagens: 10,
    });

    verificarCenario({
      veiculo: 'Carro Combustão',
      contexto: 'Pedágio',
      freq: 30,
      passagens: 50,
    });

    verificarCenario({
      veiculo: 'Caminhão',
      contexto: 'Pedágio',
      freq: 60,
      passagens: 200,
    });
  });
});
