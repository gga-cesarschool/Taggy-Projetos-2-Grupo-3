(function () {

  'use strict';

  // =========================================================================
  // ESTADO GLOBAL
  // =========================================================================
  let dadosAPI      = null;
  let veiculoAtivo  = 'carro_combustao';
  let contextoAtivo = 'pedagio';

  // =========================================================================
  // CARREGA OS FATORES DA ROTA DJANGO
  // =========================================================================
  async function carregarFatores() {
    const btn = document.getElementById('calc-btn');
    btn.disabled    = true;
    btn.textContent = 'Carregando fatores…';

    try {
      const resp = await fetch('/api/fatores-emissao/', {
        method:  'GET',
        headers: { 'Accept': 'application/json' },
      });

      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

      dadosAPI = await resp.json();
      console.info('[Calculadora] Fatores carregados — base:', dadosAPI.meta.base_emissao);

      btn.disabled    = false;
      btn.textContent = 'Calcular meu impacto';

    } catch (err) {
      console.error('[Calculadora] Falha ao carregar fatores:', err);
      btn.textContent = 'Erro ao carregar — recarregue a página';
    }
  }

  // =========================================================================
  // FÓRMULA DE EMISSÃO POR PASSAGEM (kg CO2e)
  // =========================================================================
  //
  //  E_total = E_idle + E_movimento + E_papel
  //
  //  E_idle      = (tempo_fila_min / 60) × consumo_idle × fator_emissao
  //  E_movimento = dist_extra_km         × consumo_km   × fator_emissao
  //  E_papel     = (papel_g / 1000)      × fator_papel
  //
  function emissaoPorPassagem(veiculoKey, contextoKey, comTag) {
    const { fatores_emissao: EF, veiculos, contextos } = dadosAPI;
    const v = veiculos[veiculoKey];
    const c = contextos[contextoKey];

    const tempoFila = comTag ? c.tempo_fila_com : c.tempo_fila_sem;
    const distExtra = comTag ? c.dist_extra_com : c.dist_extra_sem;
    const papelG    = comTag ? c.papel_com_g    : c.papel_sem_g;

    const ef = EF[v.combustivel];

    return (tempoFila / 60) * v.consumo_idle * ef   // E_idle
         + distExtra        * v.consumo_km   * ef   // E_movimento
         + (papelG / 1000)  * EF.papel;             // E_papel
  }

  // =========================================================================
  // HELPERS DE FORMATAÇÃO
  // =========================================================================
  function formatarCO2(kg) {
    if (kg < 1)     return { valor: (kg * 1000).toFixed(0), unidade: 'g'  };
    if (kg >= 1000) return { valor: (kg / 1000).toFixed(2), unidade: 't'  };
    return              { valor: kg.toFixed(2),             unidade: 'kg' };
  }

  function gerarDescricao(kg, totalPassagens) {
    if (kg <= 0) return 'Hoje sua escolha ajudou a reduzir o impacto no trânsito.';
    const arvores = (kg / 21.77).toFixed(1);
    const litros  = (kg / 2.212).toFixed(1);
    const papeis  = Math.round(totalPassagens);
    if (kg < 1)   return `Equivale a ${papeis} ticket(s) de papel evitado(s) este mês.`;
    if (kg < 10)  return `Equivalente a ${litros} L de gasolina não queimada este mês.`;
    if (kg < 100) return `Equivalente ao CO₂ absorvido por ${arvores} árvore(s) em um ano.`;
    return `Redução expressiva: ${(kg / 1000).toFixed(3)} toneladas de CO₂e evitadas!`;
  }

  // =========================================================================
  // CÁLCULO PRINCIPAL
  // =========================================================================
  function calcular() {
    if (!dadosAPI) {
      alert('Os fatores de emissão ainda estão sendo carregados. Aguarde.');
      return;
    }

    const freq  = parseInt(document.getElementById('freq-slider').value, 10);
    const pass  = parseInt(document.getElementById('pass-slider').value, 10);
    const total = freq * pass;

    const eSem    = emissaoPorPassagem(veiculoAtivo, contextoAtivo, false);
    const eCom    = emissaoPorPassagem(veiculoAtivo, contextoAtivo, true);
    const co2Sem  = total * eSem;
    const co2Com  = total * eCom;
    const evitado = co2Sem - co2Com;

    const fmtEvitado = formatarCO2(evitado);
    const fmtSem     = formatarCO2(co2Sem);
    const fmtCom     = formatarCO2(co2Com);

    document.getElementById('result-evitado').textContent      = fmtEvitado.valor;
    document.getElementById('result-evitado-unit').textContent = fmtEvitado.unidade;
    document.getElementById('result-evitado-desc').textContent = gerarDescricao(evitado, total);
    document.getElementById('result-sem').textContent          = fmtSem.valor;
    document.getElementById('result-sem-unit').textContent     = fmtSem.unidade;
    document.getElementById('result-com').textContent          = fmtCom.valor;
    document.getElementById('result-com-unit').textContent     = fmtCom.unidade;

    console.group('[Calculadora] Resultado');
    console.log('Veículo:', veiculoAtivo, '| Contexto:', contextoAtivo);
    console.log(`Passagens: ${freq}x × ${pass} = ${total}`);
    console.log(`Por passagem s/ Taggy: ${(eSem * 1000).toFixed(3)} g CO2e`);
    console.log(`Por passagem c/ Taggy: ${(eCom * 1000).toFixed(3)} g CO2e`);
    console.log(`Total evitado: ${evitado.toFixed(4)} kg CO2e`);
    console.groupEnd();
  }

  // =========================================================================
  // EVENTOS — veículo, contexto, sliders, botão
  // =========================================================================
  document.querySelectorAll('.calc-vehicle').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.calc-vehicle').forEach(b => b.classList.remove('calc-vehicle--active'));
      btn.classList.add('calc-vehicle--active');
      veiculoAtivo = btn.dataset.vehicle;
    });
  });

  document.querySelectorAll('.calc-context').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.calc-context').forEach(b => b.classList.remove('calc-context--active'));
      btn.classList.add('calc-context--active');
      contextoAtivo = btn.dataset.context;
    });
  });

  function atualizarSlider(slider, display, sufixo, cor) {
    const pct = ((slider.value - slider.min) / (slider.max - slider.min)) * 100;
    display.textContent = slider.value + sufixo;
    slider.style.background =
      `linear-gradient(to right, ${cor} 0%, ${cor} ${pct}%, #1C3044 ${pct}%)`;
  }

  const freqSlider = document.getElementById('freq-slider');
  const freqVal    = document.getElementById('freq-val');
  freqSlider.addEventListener('input', () => atualizarSlider(freqSlider, freqVal, 'x', '#76C442'));

  const passSlider = document.getElementById('pass-slider');
  const passVal    = document.getElementById('pass-val');
  passSlider.addEventListener('input', () => atualizarSlider(passSlider, passVal, '', '#3B82F6'));

  document.getElementById('calc-btn').addEventListener('click', calcular);

  // =========================================================================
  // INICIALIZAÇÃO
  // =========================================================================
  carregarFatores();

})();