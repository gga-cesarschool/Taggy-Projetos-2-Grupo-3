// =============================================
// TagGreen — Meu Impacto
// Dados simulados do usuário João Silva
// =============================================

(function () {
  'use strict';

  // ── Cores base ────────────────────────────────────────────────────────
  const GREEN_DARK = '#1b6e2f';
  const GREEN_MID  = '#5baa2f';
  const GREEN_FILL = 'rgba(91,170,47,0.13)';
  const MUTED      = '#8c9aa6';
  const GRID       = 'rgba(0,0,0,0.06)';

  const TOOLTIP_BASE = {
    backgroundColor: '#fff',
    borderColor: 'rgba(0,0,0,0.10)',
    borderWidth: 1,
    titleColor: '#1a2330',
    bodyColor: MUTED,
    padding: 10,
  };

  // ── Dados fake do usuário ─────────────────────────────────────────────
  const USUARIO = {
    nome: 'João',

    kpis: {
      co2e_mes_kg:       27.6,
      co2e_mes_trend:    12,        // %
      passagens_mes:     42,
      passagens_trend:   8,         // unidades
      co2e_total_kg:     268,
      co2e_ano:          2025,
      tempo_min:         105,       // minutos economizados no mês
    },

    nivel: {
      nome:          'Intermediário',
      pontos:        866,
      meta:          1000,
      pontos_faltam: 134,
    },

    // kg CO2e evitados por mês (Jan–Dez 2025)
    co2e_mensal_kg: [8.2, 12.8, 16.1, 12.4, 17.3, 17.0, 20.5, 19.2, 19.8, 27.6, 30.1, 28.4],

    // kg CO2e acumulado ao fim de cada ano
    co2e_anual: {
      labels: ['2022', '2023', '2024', '2025'],
      data:   [45.2, 118.7, 196.4, 268],
    },

    veiculos: [
      { nome: 'Honda Civic 2022', tipo: 'Combustão', icon: 'directions_car' },
      { nome: 'Yamaha MT-03',     tipo: 'Moto',       icon: 'two_wheeler'   },
    ],

    medalhas: [
      { nome: 'Primeira Passagem', icon: 'bolt',         conquistada: true  },
      { nome: '100 Passagens',     icon: 'emoji_events', conquistada: true  },
      { nome: 'Eco Warrior',       icon: 'eco',          conquistada: true  },
      { nome: '500 Passagens',     icon: 'lock',         conquistada: false },
      { nome: '1 Tonelada Evitada',icon: 'lock',         conquistada: false },
    ],

    wrapped: {
      passagens_total:  384,
      tempo_fila_h:     '19,2',
      arvores:          12,
    },
  };

  // ── Helpers DOM ───────────────────────────────────────────────────────
  const $ = id => document.getElementById(id);


  // ======================================================================
  // INICIALIZAÇÃO
  // ======================================================================

  document.addEventListener('DOMContentLoaded', () => {

    Chart.defaults.font.family = "'Inter', 'Segoe UI', sans-serif";
    Chart.defaults.font.size   = 11;
    Chart.defaults.color       = MUTED;

    // Hamburger menu
    const hamburgerBtn = $('hamburger-btn');
    const mainNav      = $('main-nav');
    if (hamburgerBtn && mainNav) {
      hamburgerBtn.addEventListener('click', () => {
        const isOpen = mainNav.classList.toggle('is-open');
        hamburgerBtn.classList.toggle('is-open', isOpen);
        hamburgerBtn.setAttribute('aria-expanded', String(isOpen));
      });
    }

    renderKPIs();
    renderNivel();
    renderVeiculos();
    renderMedalhas();
    renderMonthlyChart();
    renderAnnualChart();
    setupWrapped();

  });


  // ======================================================================
  // KPI CARDS
  // ======================================================================

  function renderKPIs() {
    const k = USUARIO.kpis;
    $('kpi-co2e-mes').textContent = k.co2e_mes_kg + ' kg';
    $('kpi-passagens').textContent = k.passagens_mes;
    $('kpi-total').textContent = k.co2e_total_kg + ' kg';
    $('kpi-tempo').textContent = k.tempo_min + ' min';
  }


  // ======================================================================
  // NÍVEL
  // ======================================================================

  function renderNivel() {
    const n = USUARIO.nivel;
    const pct = Math.round((n.pontos / n.meta) * 100);

    $('nivel-nome').textContent = n.nome;
    $('nivel-sub').textContent  = `${n.pontos_faltam} pontos para o próximo nível`;

    // Anima a barra de progresso ao carregar
    const bar = $('nivel-bar');
    if (bar) {
      bar.style.width = '0%';
      requestAnimationFrame(() => {
        setTimeout(() => { bar.style.width = pct + '%'; }, 120);
      });
    }
  }


  // ======================================================================
  // VEÍCULOS
  // ======================================================================

  function renderVeiculos() {
    const lista = $('veiculo-list');
    if (!lista) return;

    lista.innerHTML = USUARIO.veiculos.map(v => `
      <li class="veiculo-item">
        <span class="veiculo-item__icon">
          <span class="material-symbols-outlined">${v.icon}</span>
        </span>
        <div class="veiculo-item__info">
          <strong>${v.nome}</strong>
          <span>${v.tipo}</span>
        </div>
        <span class="material-symbols-outlined veiculo-item__arrow">arrow_forward</span>
      </li>
    `).join('');
  }


  // ======================================================================
  // MEDALHAS
  // ======================================================================

  function renderMedalhas() {
    const grid = $('medals-grid');
    if (!grid) return;

    grid.innerHTML = USUARIO.medalhas.map(m => `
      <div class="medal-card ${m.conquistada ? 'medal-card--earned' : 'medal-card--locked'}">
        <div class="medal-card__icon">
          <span class="material-symbols-outlined">${m.icon}</span>
        </div>
        <span class="medal-card__label">${m.nome}</span>
      </div>
    `).join('');
  }


  // ======================================================================
  // GRÁFICO DE BARRAS — Emissões Evitadas por Mês
  // ======================================================================

  function renderMonthlyChart() {
    const canvas = $('monthlyChart');
    if (!canvas) return;

    const labels = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    const data   = USUARIO.co2e_mensal_kg;

    // Mês atual levemente destacado (Out = índice 9 no array de dados fake)
    const mesAtual = new Date().getMonth(); // 0–11
    const barColors = data.map((_, i) =>
      i === mesAtual ? GREEN_DARK : GREEN_MID
    );

    new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'kg CO2e evitados',
          data,
          backgroundColor: barColors,
          borderRadius: 6,
          borderSkipped: false,
          hoverBackgroundColor: GREEN_DARK,
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
              label: ctx => ' ' + ctx.parsed.y.toFixed(1) + ' kg CO₂e',
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
              callback: v => v + ' kg',
            },
          },
        },
      },
    });
  }


  // ======================================================================
  // GRÁFICO DE LINHA — Evolução Anual
  // ======================================================================

  function renderAnnualChart() {
    const canvas = $('annualChart');
    if (!canvas) return;

    const { labels, data } = USUARIO.co2e_anual;

    new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'CO2e acumulado (kg)',
          data,
          fill: true,
          backgroundColor: GREEN_FILL,
          borderColor: GREEN_MID,
          borderWidth: 2.5,
          pointRadius: 4,
          pointBackgroundColor: GREEN_MID,
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          tension: 0.45,
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
              label: ctx => ' ' + ctx.parsed.y.toLocaleString('pt-BR') + ' kg CO₂e',
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
              callback: v => v + ' kg',
            },
          },
        },
      },
    });
  }


  // ======================================================================
  // WRAPPED MODAL — pessoal
  // ======================================================================

  function setupWrapped() {
    const modal   = $('wrapped-modal');
    const overlay = $('wrapped-overlay');
    const btnOpen = $('btn-wrapped');
    const btnClose= $('wrapped-close');

    if (!modal || !overlay || !btnOpen) return;

    // Preenche valores
    const k = USUARIO.kpis;
    const w = USUARIO.wrapped;
    $('w-total').textContent    = k.co2e_total_kg;
    $('w-passagens').textContent= w.passagens_total.toLocaleString('pt-BR');
    $('w-tempo').textContent    = w.tempo_fila_h + ' h';
    $('w-arvores').textContent  = w.arvores;
    $('w-nivel').textContent    = USUARIO.nivel.nome;

    function abrir() {
      modal.classList.add('wrapped-modal--open');
      overlay.classList.add('wrapped-overlay--open');
      document.body.style.overflow = 'hidden';
    }

    function fechar() {
      modal.classList.remove('wrapped-modal--open');
      overlay.classList.remove('wrapped-overlay--open');
      document.body.style.overflow = '';
    }

    btnOpen.addEventListener('click', abrir);
    if (btnClose) btnClose.addEventListener('click', fechar);
    overlay.addEventListener('click', fechar);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') fechar(); });
  }

})();