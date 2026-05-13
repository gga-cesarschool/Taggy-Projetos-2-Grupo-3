// =============================================
// TagGreen -- Empresas / Painel ESG Corporativo
// =============================================

(function () {
  'use strict';

  // ── Cores base (mantidas do JS original) ──────────────────────────────
  const GREEN_DARK = '#1b6e2f';
  const GREEN_MID  = '#5baa2f';
  const BLUE       = '#4a9eff';
  const MUTED      = '#8c9aa6';
  const GRID       = 'rgba(0,0,0,0.06)';

  // Opções de tooltip reutilizáveis (padrão original)
  const TOOLTIP_BASE = {
    backgroundColor: '#fff',
    borderColor: 'rgba(0,0,0,0.10)',
    borderWidth: 1,
    titleColor: '#1a2330',
    bodyColor: MUTED,
    padding: 10,
  };

  // ── Estado global do dashboard ─────────────────────────────────────────
  const state = {
    ano:       2025,
    contextos: ['pedagio', 'estacionamento', 'acesso_controlado'],
    veiculos:  ['carro_combustao', 'carro_eletrico', 'moto', 'caminhao'],
    estados:   null,   // null = todos
    dados:     null,
  };

  // ── Instâncias Chart.js (criadas uma vez, atualizadas nos filtros) ─────
  let monthlyChart = null;
  let contextChart = null;
  let annualChart  = null;

  // ── Helpers DOM ────────────────────────────────────────────────────────
  const $ = id => document.getElementById(id);


  // ======================================================================
  // API — busca dados com filtros aplicados
  // ======================================================================

  async function fetchDados() {
    const params = new URLSearchParams({ ano: state.ano });

    const ctxAll = ['pedagio', 'estacionamento', 'acesso_controlado'];
    if (state.contextos.length < ctxAll.length)
      params.set('contexto', state.contextos.join(','));

    const veiAll = ['carro_combustao', 'carro_eletrico', 'moto', 'caminhao'];
    if (state.veiculos.length < veiAll.length)
      params.set('veiculo', state.veiculos.join(','));

    if (state.estados && state.estados.length)
      params.set('estado', state.estados.join(','));

    const resp = await fetch(`/api/empresas/dados/?${params}`);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return resp.json();
  }


  // ======================================================================
  // RENDERIZAÇÃO — KPI Cards
  // ======================================================================

  function renderKPIs(kpis) {
    const co2e = kpis.co2e_evitado;
    $('kpi-co2e-val').textContent = co2e.valor_ton + ' ton';
    $('kpi-co2e-trend').innerHTML =
      `<span class="material-symbols-outlined">${co2e.trend_dir === 'up' ? 'trending_up' : 'trending_down'}</span>` +
      `${co2e.trend_pct > 0 ? '+' : ''}${co2e.trend_pct}%`;

    const pass    = kpis.passagens;
    const passVal = pass.valor >= 1000
      ? (pass.valor / 1000).toFixed(0) + 'K'
      : pass.valor.toLocaleString('pt-BR');
    $('kpi-pass-val').textContent = passVal;
    $('kpi-pass-trend').innerHTML =
      `<span class="material-symbols-outlined">${pass.trend_dir === 'up' ? 'trending_up' : 'trending_down'}</span>` +
      `${pass.trend_pct > 0 ? '+' : ''}${pass.trend_pct}%`;

    const est = kpis.estados_ativos;
    $('kpi-est-val').textContent = est.valor;
    $('kpi-est-trend').innerHTML =
      `<span class="material-symbols-outlined">${est.trend_dir === 'up' ? 'trending_up' : 'trending_down'}</span>` +
      `${est.trend_abs > 0 ? '+' : ''}${est.trend_abs}`;

    const rank = kpis.ranking_nacional;
    $('kpi-rank-val').textContent  = '#' + rank.posicao;
    $('kpi-rank-trend').textContent = rank.grupo;
  }


  // ======================================================================
  // RENDERIZAÇÃO — Gráfico de linha: Evolução Mensal
  // ======================================================================

  function renderMonthly(data) {
    $('monthly-chart-title').textContent = `Evolucao Mensal ${data.ano}`;

    // Se o chart já existe, só atualiza os dados
    if (monthlyChart) {
      monthlyChart.data.labels             = data.labels;
      monthlyChart.data.datasets[0].data   = data.series_kg;
      monthlyChart.update('active');
      return;
    }

    const canvas = $('monthlyChart');
    if (!canvas) return;

    monthlyChart = new Chart(canvas, {
      type: 'line',
      data: {
        labels: data.labels,
        datasets: [{
          label: 'kg CO2e evitados',
          data: data.series_kg,
          fill: true,
          backgroundColor: 'rgba(91,170,47,0.12)',
          borderColor: GREEN_MID,
          borderWidth: 2.5,
          pointRadius: 3,
          pointBackgroundColor: GREEN_MID,
          tension: 0.42,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            ...TOOLTIP_BASE,
            callbacks: {
              label: ctx => ' ' + ctx.parsed.y.toLocaleString('pt-BR') + ' kg CO2e',
            },
          },
        },
        scales: {
          x: {
            grid: { color: GRID },
            border: { dash: [4, 4], display: false },
            ticks: { font: { size: 11 } },
          },
          y: {
            grid: { color: GRID },
            border: { dash: [4, 4], display: false },
            ticks: {
              font: { size: 11 },
              callback: v => v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v,
            },
          },
        },
      },
    });
  }


  // ======================================================================
  // RENDERIZAÇÃO — Rosca: Distribuição por Contexto
  // ======================================================================

  function renderContext(dist) {
    const keys   = Object.keys(dist);
    const values = keys.map(k => dist[k].co2e_kg);
    const labels = keys.map(k => dist[k].label);

    // Atualiza percentuais na legenda HTML
    const pctIds = {
      pedagio:           'ctx-pedagio-pct',
      estacionamento:    'ctx-estac-pct',
      acesso_controlado: 'ctx-acesso-pct',
    };
    keys.forEach(k => {
      const el = $(pctIds[k]);
      if (el) el.textContent = dist[k].pct + '%';
    });

    if (contextChart) {
      contextChart.data.labels             = labels;
      contextChart.data.datasets[0].data   = values;
      contextChart.update('active');
      return;
    }

    const canvas = $('contextChart');
    if (!canvas) return;

    contextChart = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: [GREEN_DARK, GREEN_MID, BLUE],
          borderWidth: 0,
          hoverOffset: 6,
        }],
      },
      options: {
        responsive: false,
        cutout: '68%',
        plugins: {
          legend: { display: false },
          tooltip: {
            ...TOOLTIP_BASE,
            callbacks: {
              label: ctx => ' ' + ctx.label + ': ' + dist[keys[ctx.dataIndex]].pct + '%',
            },
          },
        },
      },
    });
  }


  // ======================================================================
  // RENDERIZAÇÃO — Ranking por Estado
  // ======================================================================

  function renderRanking(lista) {
    const ul = $('state-ranking-list');
    if (!ul) return;
    ul.innerHTML = lista.map(item => `
      <li class="state-ranking__item">
        <span class="state-ranking__pos">#${item.posicao}</span>
        <span class="state-ranking__uf">${item.uf}</span>
        <div class="state-ranking__bar-wrap">
          <div class="state-ranking__bar" style="width:${item.barra_pct}%"></div>
        </div>
        <span class="state-ranking__val">${(item.co2e_kg / 1000).toFixed(1)}t CO2e</span>
      </li>
    `).join('');
  }


  // ======================================================================
  // RENDERIZAÇÃO — Barras: Evolução Anual
  // ======================================================================

  function renderAnual(data) {
    if (annualChart) {
      annualChart.data.labels           = data.labels.map(String);
      annualChart.data.datasets[0].data = data.series_kg;
      annualChart.update('active');
      return;
    }

    const canvas = $('annualChart');
    if (!canvas) return;

    annualChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: data.labels.map(String),
        datasets: [{
          label: 'CO2e evitado (kg)',
          data: data.series_kg,
          backgroundColor: BLUE,
          borderRadius: 8,
          borderSkipped: false,
          hoverBackgroundColor: '#3a8ee8',
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            ...TOOLTIP_BASE,
            callbacks: {
              label: ctx => ' ' + ctx.parsed.y.toLocaleString('pt-BR') + ' kg CO2e',
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            border: { display: false },
            ticks: { font: { size: 11 } },
          },
          y: {
            grid: { color: GRID },
            border: { dash: [4, 4], display: false },
            ticks: {
              font: { size: 11 },
              callback: v => v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v,
            },
          },
        },
      },
    });
  }


  // ======================================================================
  // RENDERIZAÇÃO — Valores do Wrapped Modal
  // ======================================================================

  function renderWrappedValues(dados) {
    if (!dados) return;

    const kpis = dados.kpis;
    const eq   = dados.equivalencias;
    const rank = dados.kpis.ranking_nacional;
    const ano  = dados.filtros_ativos.ano;

    $('wrapped-co2e').textContent     = kpis.co2e_evitado.valor_ton.toLocaleString('pt-BR');
    $('wrapped-arvores').textContent  = (eq.arvores_ano      || 0).toLocaleString('pt-BR');
    $('wrapped-gasolina').textContent = (eq.litros_gasolina  || 0).toLocaleString('pt-BR');
    $('wrapped-papel').textContent    = (eq.papel_kg_total   || 0).toLocaleString('pt-BR');
    $('wrapped-fila').textContent     = (eq.tempo_fila_horas || 0).toLocaleString('pt-BR');
    $('wrapped-rank').textContent     = '#' + rank.posicao;
    $('wrapped-rank-grupo').textContent = rank.grupo + ' entre empresas Taggy — ' + ano;

    const badge = document.querySelector('.wrapped-badge');
    if (badge) {
      badge.innerHTML =
        `<span class="material-symbols-outlined wrapped-badge__icon">auto_awesome</span>` +
        `TagGreen Wrapped ${ano}`;
    }
  }


  // ======================================================================
  // ATUALIZA O DASHBOARD COMPLETO
  // ======================================================================

  function renderDashboard(dados) {
    state.dados = dados;
    renderKPIs(dados.kpis);
    renderMonthly(dados.evolucao_mensal);
    renderContext(dados.distribuicao_contexto);
    renderRanking(dados.ranking_estados);
    renderAnual(dados.evolucao_anual);
    renderWrappedValues(dados);
  }


  // ======================================================================
  // DOM READY — inicialização
  // ======================================================================

  document.addEventListener('DOMContentLoaded', () => {

    // Defaults do Chart.js (mantidos do JS original)
    Chart.defaults.font.family = "'Inter', 'Segoe UI', sans-serif";
    Chart.defaults.font.size   = 11;
    Chart.defaults.color       = MUTED;

    // Hamburger menu (mantido do JS original)
    const hamburgerBtn = $('hamburger-btn');
    const mainNav      = $('main-nav');
    if (hamburgerBtn && mainNav) {
      hamburgerBtn.addEventListener('click', () => {
        const isOpen = mainNav.classList.toggle('is-open');
        hamburgerBtn.classList.toggle('is-open', isOpen);
        hamburgerBtn.setAttribute('aria-expanded', String(isOpen));
      });
    }

    // Carga inicial do dashboard via API
    fetchDados()
      .then(renderDashboard)
      .catch(err => console.error('[Dashboard] Erro ao carregar dados:', err));

    // ------------------------------------------------------------------
    // FILTROS
    // ------------------------------------------------------------------

    const overlay     = $('filter-overlay');
    const drawer      = $('filter-drawer');
    const filterCount = $('filter-count');

    function abrirFiltros() {
      overlay.classList.add('filter-overlay--open');
      drawer.classList.add('filter-drawer--open');
      document.body.style.overflow = 'hidden';

      // Preenche grid de estados na primeira abertura (vem da API)
      const grid = $('filter-estados');
      if (grid && !grid.children.length && state.dados) {
        grid.innerHTML = state.dados.filtros_opcoes.estados.map(e => `
          <label class="filter-check">
            <input type="checkbox" name="estado" value="${e.uf}" checked>
            <span>${e.uf}</span>
          </label>
        `).join('');
      }

      // Sincroniza pill de ano
      document.querySelectorAll('.filter-year-pill').forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.dataset.year) === state.ano);
      });

      // Sincroniza checkboxes
      document.querySelectorAll('[name=contexto]').forEach(cb => {
        cb.checked = state.contextos.includes(cb.value);
      });
      document.querySelectorAll('[name=veiculo]').forEach(cb => {
        cb.checked = state.veiculos.includes(cb.value);
      });
    }

    function fecharFiltros() {
      overlay.classList.remove('filter-overlay--open');
      drawer.classList.remove('filter-drawer--open');
      document.body.style.overflow = '';
    }

    $('btn-filtros').addEventListener('click', abrirFiltros);
    $('filter-close').addEventListener('click', fecharFiltros);
    overlay.addEventListener('click', fecharFiltros);

    // Pills de ano — seleção exclusiva
    document.querySelectorAll('.filter-year-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-year-pill').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    // Limpar filtros
    $('filter-reset').addEventListener('click', () => {
      document.querySelectorAll('.filter-year-pill').forEach(b => {
        b.classList.toggle('active', b.dataset.year === '2025');
      });
      document.querySelectorAll('[name=contexto], [name=veiculo], [name=estado]').forEach(cb => {
        cb.checked = true;
      });
      filterCount.classList.remove('visible');
    });

    // Aplicar filtros e recarregar dashboard
    $('filter-apply').addEventListener('click', async () => {
      const anoAtivo = document.querySelector('.filter-year-pill.active');
      state.ano = anoAtivo ? parseInt(anoAtivo.dataset.year) : 2025;

      state.contextos = [...document.querySelectorAll('[name=contexto]:checked')].map(cb => cb.value);
      state.veiculos  = [...document.querySelectorAll('[name=veiculo]:checked')].map(cb => cb.value);

      const estadosCb = [...document.querySelectorAll('[name=estado]:checked')].map(cb => cb.value);
      const totalEst  = document.querySelectorAll('[name=estado]').length;
      state.estados   = estadosCb.length < totalEst ? estadosCb : null;

      fecharFiltros();

      // Badge de contagem de filtros não-padrão
      let count = 0;
      if (state.ano !== 2025)         count++;
      if (state.contextos.length < 3) count++;
      if (state.veiculos.length < 4)  count++;
      if (state.estados)              count++;
      filterCount.textContent = count;
      filterCount.classList.toggle('visible', count > 0);

      try {
        const dados = await fetchDados();
        renderDashboard(dados);
      } catch (err) {
        console.error('[Filtros] Erro ao aplicar:', err);
      }
    });


    // ------------------------------------------------------------------
    // EXPORTAR RELATÓRIO
    // ------------------------------------------------------------------

    const toast = $('export-toast');

    function gerarCSV(dados) {
      const linhas = [
        ['TagGreen — Relatório ESG Corporativo'],
        [`Empresa: ${dados.empresa.nome}`],
        [`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`],
        [`Ano: ${dados.filtros_ativos.ano}`],
        [],
        ['=== KPIs ==='],
        ['Métrica', 'Valor', 'Tendência'],
        ['CO2e Evitado Total (ton)', dados.kpis.co2e_evitado.valor_ton, dados.kpis.co2e_evitado.trend_pct + '%'],
        ['Passagens Totais', dados.kpis.passagens.valor, dados.kpis.passagens.trend_pct + '%'],
        ['Estados Ativos', dados.kpis.estados_ativos.valor, '+' + dados.kpis.estados_ativos.trend_abs],
        ['Ranking Nacional', '#' + dados.kpis.ranking_nacional.posicao, dados.kpis.ranking_nacional.grupo],
        [],
        ['=== EVOLUÇÃO MENSAL (kg CO2e) ==='],
        dados.evolucao_mensal.labels,
        dados.evolucao_mensal.series_kg,
        [],
        ['=== DISTRIBUIÇÃO POR CONTEXTO ==='],
        ['Contexto', 'kg CO2e', 'Passagens', '%'],
        ...Object.entries(dados.distribuicao_contexto).map(([, v]) =>
          [v.label, v.co2e_kg, v.passagens, v.pct + '%']
        ),
        [],
        ['=== RANKING POR ESTADO ==='],
        ['Posição', 'UF', 'Estado', 'kg CO2e'],
        ...dados.ranking_estados.map(e => [e.posicao, e.uf, e.nome, e.co2e_kg]),
        [],
        ['=== EVOLUÇÃO ANUAL (kg CO2e) ==='],
        dados.evolucao_anual.labels,
        dados.evolucao_anual.series_kg,
        [],
        ['=== META VS REALIZADO ==='],
        ['Meta (kg)',      dados.meta_vs_realizado.meta_kg],
        ['Realizado (kg)', dados.meta_vs_realizado.realizado_kg],
        ['% Atingido',     dados.meta_vs_realizado.pct_atingido + '%'],
        [],
        ['=== EQUIVALÊNCIAS ==='],
        ['Árvores/ano',                dados.equivalencias.arvores_ano],
        ['Litros gasolina evitados',   dados.equivalencias.litros_gasolina],
        ['Papel evitado (kg)',          dados.equivalencias.papel_kg_total],
        ['Horas de fila economizadas', dados.equivalencias.tempo_fila_horas],
      ];

      return linhas
        .map(row =>
          Array.isArray(row)
            ? row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';')
            : `"${String(row).replace(/"/g, '""')}"`
        )
        .join('\r\n');
    }

    function downloadCSV(csv, nomeArquivo) {
      const bom  = '\uFEFF'; // BOM para Excel reconhecer UTF-8
      const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = nomeArquivo;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

    function mostrarToast(msg) {
      $('export-toast-msg').textContent = msg;
      toast.classList.add('export-toast--show');
      setTimeout(() => toast.classList.remove('export-toast--show'), 3500);
    }

    function exportarRelatorio(dados) {
      if (!dados) return mostrarToast('Aguarde o carregamento dos dados.');
      const csv  = gerarCSV(dados);
      const data = new Date().toISOString().slice(0, 10);
      downloadCSV(csv, `taggreen_esg_${dados.filtros_ativos.ano}_${data}.csv`);
      mostrarToast('Relatório exportado com sucesso!');
    }

    $('btn-exportar').addEventListener('click', () => exportarRelatorio(state.dados));


    // ------------------------------------------------------------------
    // WRAPPED MODAL
    // ------------------------------------------------------------------

    const wrappedMod = $('wrapped-modal');

    function abrirWrapped() {
      if (state.dados) renderWrappedValues(state.dados);
      wrappedMod.classList.add('wrapped-modal--open');
      document.body.style.overflow = 'hidden';
    }

    function fecharWrapped() {
      wrappedMod.classList.remove('wrapped-modal--open');
      document.body.style.overflow = '';
    }

    $('btn-wrapped').addEventListener('click', abrirWrapped);
    $('wrapped-close').addEventListener('click', fecharWrapped);

    // Clique fora do conteúdo fecha o modal
    wrappedMod.addEventListener('click', e => {
      if (e.target === wrappedMod) fecharWrapped();
    });

    // Exportar a partir do Wrapped
    $('wrapped-export-btn').addEventListener('click', () => {
      fecharWrapped();
      setTimeout(() => exportarRelatorio(state.dados), 300);
    });

    // Tecla Esc fecha qualquer modal aberto
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        fecharFiltros();
        fecharWrapped();
      }
    });

  }); // DOMContentLoaded

})();