// =============================================
// TagGreen -- Empresas / Painel ESG Corporativo
// =============================================

document.addEventListener('DOMContentLoaded', () => {

  // Cores base
  const GREEN_DARK  = '#1b6e2f';
  const GREEN_MID   = '#5baa2f';
  const BLUE        = '#4a9eff';
  const MUTED       = '#8c9aa6';
  const GRID        = 'rgba(0,0,0,0.06)';

  Chart.defaults.font.family = "'Inter', 'Segoe UI', sans-serif";
  Chart.defaults.font.size   = 11;
  Chart.defaults.color       = MUTED;

  // ================================================
  // 1. Linha -- Evolucao Mensal 2025
  // ================================================
  const monthlyCtx = document.getElementById('monthlyChart');
  if (monthlyCtx) {
    new Chart(monthlyCtx, {
      type: 'line',
      data: {
        labels: ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'],
        datasets: [{
          label: 'kg CO2e evitados',
          data: [920, 870, 1000, 1080, 1150, 1240, 1310, 1400, 1520, 1780, 2100, 2580],
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
            backgroundColor: '#fff',
            borderColor: 'rgba(0,0,0,0.10)',
            borderWidth: 1,
            titleColor: '#1a2330',
            bodyColor: MUTED,
            padding: 10,
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

  // ================================================
  // 2. Rosca -- Distribuicao por Contexto
  // ================================================
  const contextCtx = document.getElementById('contextChart');
  if (contextCtx) {
    new Chart(contextCtx, {
      type: 'doughnut',
      data: {
        labels: ['Pedagio', 'Estacionamento', 'Acesso'],
        datasets: [{
          data: [62, 25, 13],
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
            backgroundColor: '#fff',
            borderColor: 'rgba(0,0,0,0.10)',
            borderWidth: 1,
            titleColor: '#1a2330',
            bodyColor: MUTED,
            padding: 10,
            callbacks: {
              label: ctx => ' ' + ctx.label + ': ' + ctx.parsed + '%',
            },
          },
        },
      },
    });
  }

  // ================================================
  // 3. Barras -- Evolucao Anual
  // ================================================
  const annualCtx = document.getElementById('annualChart');
  if (annualCtx) {
    new Chart(annualCtx, {
      type: 'bar',
      data: {
        labels: ['2022', '2023', '2024', '2025'],
        datasets: [{
          label: 'CO2e evitado (kg)',
          data: [5200, 12400, 22800, 18900],
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
            backgroundColor: '#fff',
            borderColor: 'rgba(0,0,0,0.10)',
            borderWidth: 1,
            titleColor: '#1a2330',
            bodyColor: MUTED,
            padding: 10,
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

  // Hamburger menu
  const hamburgerBtn = document.getElementById('hamburger-btn');
  const mainNav      = document.getElementById('main-nav');
  if (hamburgerBtn && mainNav) {
    hamburgerBtn.addEventListener('click', () => {
      const isOpen = mainNav.classList.toggle('is-open');
      hamburgerBtn.classList.toggle('is-open', isOpen);
      hamburgerBtn.setAttribute('aria-expanded', String(isOpen));
    });
  }
});