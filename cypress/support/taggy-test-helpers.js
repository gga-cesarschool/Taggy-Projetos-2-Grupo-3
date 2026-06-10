const STORAGE_KEY = 'taggy:impact-profile-v2';

const FATORES = {
  pedagio: {
    carro_combustao: { sem: 0.095, com: 0.010 },
    carro_eletrico: { sem: 0.022, com: 0.004 },
    moto: { sem: 0.052, com: 0.006 },
    caminhao: { sem: 0.385, com: 0.042 },
  },
  estacionamento: {
    carro_combustao: { sem: 0.032, com: 0.003 },
    carro_eletrico: { sem: 0.010, com: 0.002 },
    moto: { sem: 0.018, com: 0.002 },
    caminhao: { sem: 0.068, com: 0.007 },
  },
  acesso_controlado: {
    carro_combustao: { sem: 0.045, com: 0.005 },
    carro_eletrico: { sem: 0.014, com: 0.003 },
    moto: { sem: 0.026, com: 0.003 },
    caminhao: { sem: 0.145, com: 0.016 },
  },
};

const VEICULOS = {
  'Carro Combustão': 'carro_combustao',
  'Carro Elétrico': 'carro_eletrico',
  Moto: 'moto',
  Caminhão: 'caminhao',
};

const CONTEXTOS = {
  Pedágio: 'pedagio',
  Estacionamento: 'estacionamento',
  'Acesso Controlado': 'acesso_controlado',
};

const LEVELS = [
  { name: 'Básico', min: 0, medal: '🥉 Bronze' },
  { name: 'Intermediário', min: 1000, medal: '🥈 Prata' },
  { name: 'Avançado', min: 5000, medal: '🥇 Ouro' },
];

function formatPoints(value) {
  return new Intl.NumberFormat('pt-BR').format(value);
}

function formatCo2(kg) {
  if (kg < 1) return { valor: (kg * 1000).toFixed(0), unidade: 'g' };
  if (kg >= 1000) return { valor: (kg / 1000).toFixed(2), unidade: 't' };
  return { valor: kg.toFixed(2), unidade: 'kg' };
}

function gerarDescricao(kg, totalPassagens) {
  if (kg <= 0) return 'Hoje sua escolha ajudou a reduzir o impacto no trânsito';
  const arvores = (kg / 21.77).toFixed(1);
  const litros = (kg / 2.212).toFixed(1);
  const papeis = Math.round(totalPassagens);
  if (kg < 1) return `Equivale a ${papeis} ticket(s) de papel evitado(s) este mês`;
  if (kg < 10) return `Equivalente a ${litros} L de gasolina não queimada este mês`;
  if (kg < 100) return `Equivalente ao CO₂ absorvido por ${arvores} árvore(s) em um ano`;
  return `Redução significativa: ${(kg / 1000).toFixed(3)} toneladas de CO₂e evitadas!`;
}

function calcularCenario({ contexto, veiculo, freq, passagens }) {
  const totalPassagens = freq * passagens;
  const fator = FATORES[CONTEXTOS[contexto]][VEICULOS[veiculo]];
  const co2Sem = totalPassagens * fator.sem;
  const co2Com = totalPassagens * fator.com;
  const evitado = co2Sem - co2Com;
  const pontos = Math.max(1, Math.round(evitado * 100));

  return {
    totalPassagens,
    co2Sem,
    co2Com,
    evitado,
    pontos,
    freqLabel: `${freq}x`,
    passLabel: String(passagens),
    evitadoFormatado: formatCo2(evitado),
    semFormatado: formatCo2(co2Sem),
    comFormatado: formatCo2(co2Com),
    descricao: gerarDescricao(evitado, totalPassagens),
  };
}

function levelFromPoints(points) {
  let current = LEVELS[0];
  for (const level of LEVELS) {
    if (points >= level.min) current = level;
  }

  const index = LEVELS.findIndex((level) => level.name === current.name);
  const next = LEVELS[index + 1] || null;
  const progress = next ? ((points - current.min) / (next.min - current.min)) * 100 : 100;

  return {
    level: current.name,
    medal: current.medal,
    progress: Number.isFinite(progress) ? Math.min(100, Math.max(0, progress)) : 100,
  };
}

function selectScenario(cenario) {
  cy.contains('.calc-vehicle', cenario.veiculo).click();
  cy.contains('.calc-context', cenario.contexto).click();
  cy.get('#freq-slider').invoke('val', cenario.freq).trigger('input');
  cy.get('#pass-slider').invoke('val', cenario.passagens).trigger('input');
  cy.get('#calc-btn').click();
}

module.exports = {
  STORAGE_KEY,
  calcularCenario,
  formatCo2,
  formatPoints,
  gerarDescricao,
  levelFromPoints,
  selectScenario,
};
