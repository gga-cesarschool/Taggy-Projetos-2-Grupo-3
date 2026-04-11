(function () {

  // ===========================================
  // FATORES DE EMISSÃO — GHG Protocol Brasil 2023
  // ===========================================
  //
  // Metodologia por passagem (kg CO2e):
  //
  // PEDÁGIO (sem Taggy):
  //   Marcha lenta: ~3 min fila × consumo em idle × fator emissão
  //     Gasolina:  2,212 kg CO2e/L  |  idle: ~0,70 L/h  → 3 min = 0,0350 L → 0,0775 kg
  //     Diesel:    2,603 kg CO2e/L  |  idle: ~2,50 L/h  → 3 min = 0,1250 L → 0,3254 kg
  //   Frenagem + aceleração extra: ~0,1 km adicional
  //     Gasolina: 0,1 km × (8 L/100km) × 2,212 = 0,0177 kg
  //     Diesel:   0,1 km × (30 L/100km) × 2,603 = 0,0781 kg
  //   Papel (ticket): 5 g × 1,1 kg CO2e/kg papel = 0,0055 kg
  //   Elétrico: grid BR 0,0817 kg CO2e/kWh | ~0,2 kWh idle equiv → 0,0163 kg
  //
  // ESTACIONAMENTO (sem Taggy):
  //   Principal: papel do ticket + marcha lenta fila entrada/saída (~1,5 min)
  //
  // ACESSO CONTROLADO (sem Taggy):
  //   Intermediário: tempo menor de fila (~1 min) + papel
  //
  // COM TAGGY: apenas emissão residual do deslocamento normal (sem fila, sem papel)

  const FATORES = {
    //                     sem (kg CO2e)   com (kg CO2e)
    pedagio: {
      carro_combustao: { sem: 0.095, com: 0.010 },
      carro_eletrico:  { sem: 0.022, com: 0.004 },
      moto:            { sem: 0.052, com: 0.006 },
      caminhao:        { sem: 0.385, com: 0.042 },
    },
    estacionamento: {
      carro_combustao: { sem: 0.032, com: 0.003 },
      carro_eletrico:  { sem: 0.010, com: 0.002 },
      moto:            { sem: 0.018, com: 0.002 },
      caminhao:        { sem: 0.068, com: 0.007 },
    },
    acesso_controlado: {
      carro_combustao: { sem: 0.045, com: 0.005 },
      carro_eletrico:  { sem: 0.014, com: 0.003 },
      moto:            { sem: 0.026, com: 0.003 },
      caminhao:        { sem: 0.145, com: 0.016 },
    },
  };

  // ===========================================
  // ESTADO GLOBAL
  // ===========================================
  let veiculoAtivo  = 'carro_combustao';
  let contextoAtivo = 'pedagio';

  // ===========================================
  // HELPERS
  // ===========================================

  /**
   * Formata kg CO2e:
   *   < 1 kg   → "XXX g" (gramas)
   *   >= 1 kg  → "X.XX kg"
   *   >= 1000  → "X.XX t"
   */
  function formatarCO2(kg) {
    if (kg < 1) {
      return { valor: (kg * 1000).toFixed(0), unidade: 'g' };
    } else if (kg >= 1000) {
      return { valor: (kg / 1000).toFixed(2), unidade: 't' };
    } else {
      return { valor: kg.toFixed(2), unidade: 'kg' };
    }
  }

  /** Gera texto descritivo do resultado evitado */
  function gerarDescricao(kg, totalPassagens) {
    if (kg <= 0) return 'Hoje sua escolha ajudou a reduzir o impacto no trânsito';

    const arvores  = (kg / 21.77).toFixed(1);   // 1 árvore absorve ~21,77 kg CO2/ano (IPCC)
    const litros   = (kg / 2.212).toFixed(1);   // L equivalente de gasolina
    const papeis   = Math.round(totalPassagens); // 1 ticket por passagem

    if (kg < 1)    return `Equivale a ${papeis} ticket(s) de papel evitado(s) este mês`;
    if (kg < 10)   return `Equivalente a ${litros} L de gasolina não queimada este mês`;
    if (kg < 100)  return `Equivalente ao CO₂ absorvido por ${arvores} árvore(s) em um ano`;
    return `Redução significativa: ${(kg/1000).toFixed(3)} toneladas de CO₂e evitadas!`;
  }

  // ===========================================
  // CÁLCULO PRINCIPAL
  // ===========================================
  function calcular() {
    const freq  = parseInt(document.getElementById('freq-slider').value, 10);
    const pass  = parseInt(document.getElementById('pass-slider').value, 10);
    const total = freq * pass;

    const fator    = FATORES[contextoAtivo][veiculoAtivo];
    const co2Sem   = total * fator.sem;
    const co2Com   = total * fator.com;
    const evitado  = co2Sem - co2Com;

    // Atualiza os displays
    const fmtEvitado = formatarCO2(evitado);
    const fmtSem     = formatarCO2(co2Sem);
    const fmtCom     = formatarCO2(co2Com);

    document.getElementById('result-evitado').textContent      = fmtEvitado.valor;
    document.getElementById('result-evitado-unit').textContent = fmtEvitado.unidade;
    document.getElementById('result-evitado-desc').textContent = gerarDescricao(evitado, total);

    document.getElementById('result-sem').textContent      = fmtSem.valor;
    document.getElementById('result-sem-unit').textContent = fmtSem.unidade;

    document.getElementById('result-com').textContent      = fmtCom.valor;
    document.getElementById('result-com-unit').textContent = fmtCom.unidade;
  }

  // ===========================================
  // VEÍCULOS
  // ===========================================
  document.querySelectorAll('.calc-vehicle').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.calc-vehicle').forEach(b => b.classList.remove('calc-vehicle--active'));
      btn.classList.add('calc-vehicle--active');
      veiculoAtivo = btn.dataset.vehicle;
    });
  });

  // ===========================================
  // CONTEXTOS
  // ===========================================
  document.querySelectorAll('.calc-context').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.calc-context').forEach(b => b.classList.remove('calc-context--active'));
      btn.classList.add('calc-context--active');
      contextoAtivo = btn.dataset.context;
    });
  });

  // ===========================================
  // SLIDERS
  // ===========================================
  function atualizarSlider(slider, display, sufixo, cor) {
    const pct = ((slider.value - slider.min) / (slider.max - slider.min)) * 100;
    display.textContent = slider.value + sufixo;
    slider.style.background =
      `linear-gradient(to right, ${cor} 0%, ${cor} ${pct}%, #1C3044 ${pct}%)`;
  }

  const freqSlider = document.getElementById('freq-slider');
  const freqVal    = document.getElementById('freq-val');
  freqSlider.addEventListener('input', () =>
    atualizarSlider(freqSlider, freqVal, 'x', '#76C442')
  );

  const passSlider = document.getElementById('pass-slider');
  const passVal    = document.getElementById('pass-val');
  passSlider.addEventListener('input', () =>
    atualizarSlider(passSlider, passVal, '', '#3B82F6')
  );

  // ===========================================
  // BOTÃO CALCULAR
  // ===========================================
  document.getElementById('calc-btn').addEventListener('click', calcular);

  // ===========================================
  // FAQ ACCORDION
  // ===========================================
  document.querySelectorAll('.faq-item').forEach(item => {
    const btn    = item.querySelector('.faq-item__btn');
    const answer = item.querySelector('.faq-item__answer');

    // Abre o primeiro item já no load
    if (item.classList.contains('faq-item--open')) {
      answer.style.maxHeight = answer.scrollHeight + 'px';
    }

    btn.addEventListener('click', () => {
      const isOpen = item.classList.contains('faq-item--open');

      document.querySelectorAll('.faq-item').forEach(i => {
        i.classList.remove('faq-item--open');
        i.querySelector('.faq-item__answer').style.maxHeight = null;
        i.querySelector('.faq-item__btn').setAttribute('aria-expanded', 'false');
      });

      if (!isOpen) {
        item.classList.add('faq-item--open');
        answer.style.maxHeight = answer.scrollHeight + 'px';
        btn.setAttribute('aria-expanded', 'true');
      }
    });
  });

  // ===========================================
  // HAMBURGER
  // ===========================================
  const hamburger = document.getElementById('hamburger-btn');
  const nav       = document.getElementById('main-nav');
  if (hamburger && nav) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('is-open');
      nav.classList.toggle('is-open');
      hamburger.setAttribute('aria-expanded', nav.classList.contains('is-open'));
    });
  }

})();