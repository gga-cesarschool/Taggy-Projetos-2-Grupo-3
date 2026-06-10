describe('Reprodução automática de áudio', () => {
  let audioPlayStub;

  beforeEach(() => {
    cy.visit('/', {
      onBeforeLoad(win) {
        audioPlayStub = Cypress.sinon.stub().resolves();
        const audioMock = {
          currentTime: 0,
          preload: 'auto',
          play: audioPlayStub,
        };

        Cypress.sinon.stub(win, 'Audio').callsFake(() => audioMock);
        win.__audioPlayStub = audioPlayStub;
      },
    });
  });

  it('reproduz som nas interações principais quando o áudio está ativo', () => {
    cy.window().its('__audioPlayStub').then((stub) => {
      expect(stub.callCount).to.eq(0);
    });

    cy.contains('.calc-vehicle', 'Carro Elétrico').click();
    cy.window().its('__audioPlayStub').then((stub) => {
      expect(stub.callCount).to.eq(1);
    });

    cy.contains('.calc-context', 'Estacionamento').click();
    cy.window().its('__audioPlayStub').then((stub) => {
      expect(stub.callCount).to.eq(2);
    });

    cy.get('#freq-slider').invoke('val', 25).trigger('input');
    cy.window().its('__audioPlayStub').then((stub) => {
      expect(stub.callCount).to.eq(3);
    });

    cy.get('#calc-btn').click();
    cy.window().its('__audioPlayStub').then((stub) => {
      expect(stub.callCount).to.eq(4);
    });
  });

  it('bloqueia a reprodução quando o modo mudo está ativado', () => {
    cy.get('.calc-card__mute')
      .click({ force: true })
      .should('have.attr', 'aria-pressed', 'true');

    cy.contains('.calc-vehicle', 'Moto').click();
    cy.contains('.calc-context', 'Acesso Controlado').click();
    cy.get('#calc-btn').click();

    cy.window().its('__audioPlayStub').then((stub) => {
      expect(stub.callCount).to.eq(0);
    });
  });
});
