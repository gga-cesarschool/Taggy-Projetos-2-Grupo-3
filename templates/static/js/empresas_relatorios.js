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

  function fmtCo2e(kg) {
    if (kg === 0) return '0 kg';
    if (kg < 1)   return (kg * 1000).toFixed(1) + ' g';
    if (kg < 1000) return kg.toFixed(2) + ' kg';
    return (kg / 1000).toFixed(2) + ' ton';
  }

  function renderKPIs(kpis) {
    const co2e = kpis.co2e_evitado;
    $('kpi-co2e-val').textContent = fmtCo2e(co2e.valor_kg !== undefined ? co2e.valor_kg : co2e.valor_ton * 1000);
    const coTrend = $('kpi-co2e-trend');
    if (coTrend) {
      if (co2e.trend_pct === 0 || co2e.trend_pct === null) {
        coTrend.style.display = 'none';
      } else {
        coTrend.style.display = '';
        coTrend.innerHTML =
          `<span class="material-symbols-outlined">${co2e.trend_dir === 'up' ? 'trending_up' : 'trending_down'}</span>` +
          `${co2e.trend_pct > 0 ? '+' : ''}${co2e.trend_pct}%`;
      }
    }

    const pass    = kpis.passagens;
    const passVal = pass.valor >= 1000
      ? (pass.valor / 1000).toFixed(0) + 'K'
      : pass.valor.toLocaleString('pt-BR');
    $('kpi-pass-val').textContent = passVal;
    const paTrend = $('kpi-pass-trend');
    if (paTrend) {
      if (pass.trend_pct === 0 || pass.trend_pct === null) {
        paTrend.style.display = 'none';
      } else {
        paTrend.style.display = '';
        paTrend.innerHTML =
          `<span class="material-symbols-outlined">${pass.trend_dir === 'up' ? 'trending_up' : 'trending_down'}</span>` +
          `${pass.trend_pct > 0 ? '+' : ''}${pass.trend_pct}%`;
      }
    }

    const est = kpis.estados_ativos;
    $('kpi-est-val').textContent = est.valor;
    const estTrend = $('kpi-est-trend');
    if (estTrend) {
      if (est.trend_abs === 0) { estTrend.style.display = 'none'; }
      else {
        estTrend.style.display = '';
        estTrend.innerHTML =
          `<span class="material-symbols-outlined">${est.trend_dir === 'up' ? 'trending_up' : 'trending_down'}</span>` +
          `${est.trend_abs > 0 ? '+' : ''}${est.trend_abs}`;
      }
    }

    const rank = kpis.ranking_nacional;
    const rankVal = $('kpi-rank-val');
    const rankTrend = $('kpi-rank-trend');
    if (rank.posicao !== null && rank.posicao !== undefined) {
      if (rankVal)   rankVal.textContent   = '#' + rank.posicao;
      if (rankTrend) rankTrend.textContent = rank.grupo;
    } else {
      if (rankVal)   rankVal.textContent   = '—';
      if (rankTrend) rankTrend.textContent = '';
    }
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
    if (!lista || lista.length === 0) {
      if (ul) ul.innerHTML = '<li style="color:#718096;padding:1rem;font-size:1.3rem;">Sem dados de ranking por estado disponíveis.</li>';
      return;
    }
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
    checkDemoBanner(dados);
  }


  // ======================================================================
  // DOM READY — inicialização
  // ======================================================================

  document.addEventListener('DOMContentLoaded', () => {

    // Defaults do Chart.js (mantidos do JS original)
    Chart.defaults.font.family = "'Inter', 'Segoe UI', sans-serif";
    Chart.defaults.font.size   = 11;
    Chart.defaults.color       = MUTED;

    initRegistrarUso();

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
        [`Empresa: ${dados.empresa ? dados.empresa.nome : ''}`],
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
// ------------------------------------------------------------------
    // RANKING ENTRE EMPRESAS
    // ------------------------------------------------------------------

    fetch('/api/ranking/empresas/')
      .then(r => r.json())
      .then(data => {
        if (!data.ok) return;

        const e = data.empresa;

        // Avatar e posição
        document.getElementById('emp-ranking-avatar').textContent       = e.iniciais;
        document.getElementById('emp-ranking-posicao-num').textContent  = `#${e.posicao}`;
        document.getElementById('emp-ranking-hero-co2').textContent     = e.co2e_ton.toFixed(2);
        document.getElementById('emp-ranking-hero-nivel').textContent   = `🏢 ${e.nivel}`;
        document.getElementById('emp-ranking-total').textContent        = e.total;
        document.getElementById('emp-ranking-lista-total').textContent  = `${e.total} empresas`;

        // Passagens
        document.getElementById('emp-ranking-passagens').textContent =
          e.passagens >= 1000
            ? (e.passagens / 1000).toFixed(0) + 'K'
            : e.passagens;

        // Barra de progresso
        const fillEl  = document.getElementById('emp-ranking-progress-fill');
        const faltaEl = document.getElementById('emp-ranking-falta');
        const labelEl = document.getElementById('emp-ranking-progress-label');

        if (e.posicao === 1) {
          fillEl.style.width  = '100%';
          faltaEl.textContent = '🏆 Líder!';
          labelEl.textContent = 'Sua empresa está na primeira posição';
        } else {
          const pct = Math.min(99, Math.round((e.co2e_ton / (e.co2e_ton + e.falta_ton)) * 100));
          fillEl.style.width  = `${pct}%`;
          faltaEl.textContent = `Faltam ${e.falta_ton.toFixed(2)} ton`;
          labelEl.textContent = `Progresso para a posição #${e.posicao - 1}`;
        }

        // Lista
        const lista = document.getElementById('emp-ranking-lista');
        lista.innerHTML = '';

        if (!data.ranking || data.ranking.length === 0) {
          lista.innerHTML = '<li class="emp-ranking-lista__loading">Nenhum dado disponível.</li>';
          return;
        }

        const medalhas = ['🥇', '🥈', '🥉'];

        data.ranking.forEach((item, idx) => {
          const pos       = idx + 1;
          const posLabel  = pos <= 3 ? medalhas[pos - 1] : pos;
          const voceClass = item.e_voce ? 'emp-ranking-item--voce' : '';
          const voceBadge = item.e_voce
            ? '<span class="emp-ranking-item__badge emp-ranking-item__badge--voce">sua empresa</span>'
            : '';
          const nivelBadge =
            `<span class="emp-ranking-item__badge emp-ranking-item__badge--nivel">${item.nivel}</span>`;

          const passFormatado = item.passagens >= 1000
            ? (item.passagens / 1000).toFixed(0) + 'K'
            : item.passagens;

          const li = document.createElement('li');
          li.className = `emp-ranking-item ${voceClass}`.trim();
          li.innerHTML = `
            <div class="emp-ranking-item__barra" style="width:${item.barra_pct}%"></div>
            <span class="emp-ranking-item__pos">${posLabel}</span>
            <div class="emp-ranking-item__avatar">${item.iniciais}</div>
            <div class="emp-ranking-item__info">
              <div class="emp-ranking-item__nome">
                ${item.nome}${voceBadge}${nivelBadge}
              </div>
              <div class="emp-ranking-item__detalhes">
                <span>🌿 ${item.co2e_ton.toFixed(1)} ton CO₂</span>
                <span>⚡ ${passFormatado} passagens</span>
              </div>
            </div>
            <span class="emp-ranking-item__co2">${item.co2e_ton.toFixed(1)} ton</span>
          `;
          lista.appendChild(li);
        });
      })
      .catch(() => {
        document.getElementById('emp-ranking-lista').innerHTML =
          '<li class="emp-ranking-lista__loading">Erro ao carregar ranking.</li>';
      });
  }); // DOMContentLoaded


  // ======================================================================
  // BANNER DE DADOS DEMONSTRATIVOS
  // ======================================================================
  function checkDemoBanner(dados) {
    const banner = $('demo-banner');
    if (!banner) return;
    if (dados.empresa && dados.empresa.is_demo) {
      banner.style.display = 'flex';
      const btnBanner = $('demo-banner-registrar');
      if (btnBanner) btnBanner.addEventListener('click', abrirRegistrarUso);
    } else {
      banner.style.display = 'none';
    }
  }

  // ======================================================================
  // MODAL REGISTRAR USO — com selecao de veiculo da frota
  // ======================================================================

  // Fatores de CO2e (espelha views.py)
  const RU_CALC = {
    fatores:  { gasolina:2.212, diesel:2.603, flex_mix:1.335, grid_br:0.0817, papel:1.100 },
    veiculos: {
      carro_combustao: { combustivel:'flex_mix',  consumo_idle:0.65 },
      carro_eletrico:  { combustivel:'grid_br',   consumo_idle:0.15 },
      moto:            { combustivel:'gasolina',  consumo_idle:0.28 },
      caminhao:        { combustivel:'diesel',    consumo_idle:2.40 },
    },
    contextos: {
      pedagio:           { tempo_sem:3.0, tempo_com:0.05, dist_sem:0.100, dist_com:0.031, papel_sem:5.0 },
      estacionamento:    { tempo_sem:1.5, tempo_com:0.05, dist_sem:0.050, dist_com:0.010, papel_sem:8.0 },
      acesso_controlado: { tempo_sem:1.0, tempo_com:0.05, dist_sem:0.030, dist_com:0.010, papel_sem:4.0 },
    },
  };

  function ruCalcCo2e(tipoVeiculo, contexto) {
    const v = RU_CALC.veiculos[tipoVeiculo];
    const c = RU_CALC.contextos[contexto];
    if (!v || !c) return 0;
    const f    = RU_CALC.fatores[v.combustivel];
    const eSem = (c.tempo_sem / 60) * v.consumo_idle * f
                + c.dist_sem * (v.consumo_idle * f / 60)
                + (c.papel_sem / 1000) * RU_CALC.fatores.papel;
    const eCom = (c.tempo_com / 60) * v.consumo_idle * f
                + c.dist_com * (v.consumo_idle * f / 60);
    return Math.max(0, eSem - eCom);
  }

  let _frotaCache = [];

  async function carregarFrota() {
    const sel  = $('ru-veiculo');
    const hint = $('ru-frota-hint');
    if (!sel) return;

    sel.innerHTML = '<option value="">Carregando...</option>';
    sel.disabled  = true;

    try {
      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), 8000);
      const res  = await fetch('/api/empresa/frota/', { signal: controller.signal });
      clearTimeout(tid);
      const data = await res.json();
      _frotaCache = (data.ok && data.veiculos) ? data.veiculos : [];
    } catch(e) {
      _frotaCache = [];
    }

    if (_frotaCache.length) {
      sel.innerHTML =
        '<option value="">Selecione um veiculo...</option>' +
        _frotaCache.map(v =>
          `<option value="${v.id}" data-tipo="${v.tipo}">${v.nome}${v.placa ? ' · ' + v.placa : ''} (${v.tipo_label}) — ${v.proprietario}</option>`
        ).join('');
      if (hint) hint.style.display = 'none';
    } else {
      sel.innerHTML = '<option value="">Nenhum veiculo vinculado ainda</option>';
      if (hint) hint.style.display = 'block';
    }

    sel.disabled = false;
    atualizarPreviewRU();
  }

  function atualizarPreviewRU() {
    const sel     = $('ru-veiculo');
    const ctxEl   = document.querySelector('input[name="ru-ctx"]:checked');
    const qtdEl   = $('ru-qtd');
    const prev    = $('ru-preview');
    const prevVal = $('ru-preview-val');
    if (!sel || !ctxEl || !qtdEl || !prev) return;

    const opt  = sel.options[sel.selectedIndex];
    const tipo = opt ? opt.dataset.tipo : null;
    const ctx  = ctxEl.value;
    const qtd  = parseInt(qtdEl.value) || 1;

    if (!tipo || !ctx) { prev.style.display = 'none'; return; }

    const co2eUnit  = ruCalcCo2e(tipo, ctx) * qtd;
    const co2eTotal = co2eUnit * qtd;
    const display   = co2eUnit < 1
      ? (co2eUnit * 1000).toFixed(1) + ' g'
      : co2eUnit.toFixed(3) + ' kg';
    prevVal.textContent = display + ' CO2e evitados por passagem × ' + qtd + ' = ' +
      (co2eUnit * qtd < 1 ? (co2eUnit * qtd * 1000).toFixed(1) + ' g' : (co2eUnit * qtd).toFixed(3) + ' kg') + ' total';
    prev.style.display = 'flex';
  }

  function _setModalVisible(visible) {
    const modal   = $('ru-modal');
    const overlay = $('ru-overlay');
    if (!modal || !overlay) return;
    if (visible) {
      modal.hidden          = false;
      overlay.hidden        = false;
      modal.style.display   = 'flex';
      overlay.style.display = 'block';
      document.body.style.overflow = 'hidden';
    } else {
      modal.hidden          = true;
      overlay.hidden        = true;
      modal.style.display   = 'none';
      overlay.style.display = 'none';
      document.body.style.overflow = '';
    }
  }

  function abrirRegistrarUso() {
    const dataEl = $('ru-data');
    if (dataEl) dataEl.value = new Date().toISOString().split('T')[0];
    if ($('ru-err'))     { $('ru-err').style.display = 'none'; }
    if ($('ru-suc'))     { $('ru-suc').style.display = 'none'; }
    if ($('ru-preview')) { $('ru-preview').style.display = 'none'; }
    _setModalVisible(true);
    carregarFrota();
  }

  function fecharRegistrarUso() {
    _setModalVisible(false);
  }

  async function salvarRegistrarUso() {
    const btnSave  = $('ru-save');
    const errEl    = $('ru-err');
    const sucEl    = $('ru-suc');
    if (errEl) errEl.style.display = 'none';
    if (sucEl) sucEl.style.display = 'none';

    const veiculoId = $('ru-veiculo')?.value;
    const ctx       = document.querySelector('input[name="ru-ctx"]:checked')?.value;
    const qtd       = parseInt($('ru-qtd')?.value) || 0;
    const data      = $('ru-data')?.value;

    if (!veiculoId) {
      if (errEl) { errEl.textContent = 'Selecione um veiculo da frota.'; errEl.style.display = 'block'; }
      return;
    }
    if (!ctx || qtd < 1 || !data) {
      if (errEl) { errEl.textContent = 'Preencha todos os campos.'; errEl.style.display = 'block'; }
      return;
    }

    if (btnSave) btnSave.disabled = true;
    try {
      const res = await fetch('/api/empresa/registrar-passagem/', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': window._CSRF || '' },
        body:    JSON.stringify({ veiculo_id: parseInt(veiculoId), contexto: ctx, data, quantidade: qtd }),
      });
      const d = await res.json();
      if (d.ok) {
        if (sucEl) { sucEl.textContent = d.mensagem || 'Registrado com sucesso!'; sucEl.style.display = 'block'; }
        setTimeout(() => { fecharRegistrarUso(); carregarDados(); }, 1600);
      } else {
        if (errEl) { errEl.textContent = d.erro || 'Erro ao registrar.'; errEl.style.display = 'block'; }
      }
    } catch(e) {
      console.error('[Registrar Uso] Erro:', e);
      if (errEl) {
        errEl.textContent = 'Erro ao registrar. Verifique se o CSRF está configurado e tente novamente.';
        errEl.style.display = 'block';
      }
    } finally {
      if (btnSave) btnSave.disabled = false;
    }
  }

  function initRegistrarUso() {
    const btnAbrir = $('btn-registrar-uso');
    if (btnAbrir) btnAbrir.addEventListener('click', abrirRegistrarUso);
    if ($('ru-cancel'))  $('ru-cancel').addEventListener('click',  fecharRegistrarUso);
    if ($('ru-close'))   $('ru-close').addEventListener('click',   fecharRegistrarUso);
    if ($('ru-overlay')) $('ru-overlay').addEventListener('click', fecharRegistrarUso);
    if ($('ru-save'))    $('ru-save').addEventListener('click',    salvarRegistrarUso);
    if ($('demo-banner-registrar')) $('demo-banner-registrar').addEventListener('click', abrirRegistrarUso);

    // Preview em tempo real
    document.querySelectorAll('input[name="ru-ctx"]').forEach(r => r.addEventListener('change', atualizarPreviewRU));
    if ($('ru-qtd'))     $('ru-qtd').addEventListener('input', atualizarPreviewRU);
    if ($('ru-veiculo')) $('ru-veiculo').addEventListener('change', atualizarPreviewRU);
  }

  // ======================================================================
  // HOOK: checkDemoBanner chamado no renderDashboard
  // ======================================================================

})();