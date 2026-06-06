/**
 * TagGreen — Ranking de Impacto
 * Consome /api/ranking/?periodo=mes|trimestre|ano
 * Sem nenhum dado chumbado — tudo vem do banco via API.
 */
(function () {
  'use strict';

  // ── Utilitários ─────────────────────────────────────────────────────────────

  function fmt(n, d) {
    return Number(n).toFixed(d === undefined ? 1 : d).replace('.', ',');
  }

  function fmtTempo(min) {
    if (!min || min === 0) return '0 min';
    if (min >= 60) return fmt(min / 60) + ' h';
    return Math.round(min) + ' min';
  }

  function fmtCo2(kg) {
    if (!kg || kg === 0) return '0 kg';
    if (kg < 1) return fmt(kg * 1000, 0) + ' g';
    return fmt(kg) + ' kg';
  }

  function set(id, val) {
    var el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  // ── Estado ──────────────────────────────────────────────────────────────────

  var _periodoAtivo = 'mes';   // mes | trimestre | ano  (conforme data-periodo no HTML)

  // ── Renderização do card hero (posição do usuário logado) ────────────────────

  function renderHero(u) {
    set('ranking-avatar',       u.iniciais || '?');
    set('ranking-posicao-num',  '#' + u.posicao);
    set('ranking-hero-co2',     fmt(u.co2e));
    set('ranking-hero-nivel',   '🌿 ' + u.nivel);
    set('ranking-lista-total',  u.total + ' usuário' + (u.total !== 1 ? 's' : ''));
    set('ranking-tempo',        fmtTempo(u.tempo_min));
    set('ranking-passagens',    u.passagens);

    // Barra de progresso para a posição acima
    var fillEl  = document.getElementById('ranking-progress-fill');
    var faltaEl = document.getElementById('ranking-falta');
    var labelEl = document.getElementById('ranking-progress-label');

    if (u.posicao === 1) {
      if (fillEl)  fillEl.style.width  = '100%';
      if (faltaEl) faltaEl.textContent = '🏆 Líder do ranking!';
      if (labelEl) labelEl.textContent = 'Você está na primeira posição';
    } else if (u.falta_kg !== null && u.falta_kg !== undefined) {
      var pct = Math.min(99, Math.round((u.co2e / (u.co2e + u.falta_kg)) * 100));
      if (fillEl)  fillEl.style.width  = pct + '%';
      if (faltaEl) faltaEl.textContent = 'Faltam ' + fmt(u.falta_kg) + ' kg';
      if (labelEl) labelEl.textContent = 'Progresso para a posição #' + (u.posicao - 1);
    } else {
      // Usuário sem passagens no período
      if (fillEl)  fillEl.style.width  = '0%';
      if (faltaEl) faltaEl.textContent = 'Registre passagens para aparecer no ranking';
      if (labelEl) labelEl.textContent = 'Você ainda não tem dados neste período';
    }
  }

  // ── Renderização da lista ────────────────────────────────────────────────────

  function renderLista(ranking) {
    var lista = document.getElementById('ranking-lista');
    if (!lista) return;

    if (!ranking || ranking.length === 0) {
      lista.innerHTML = '<li class="ranking-lista__loading">Nenhum usuário com passagens neste período.</li>';
      return;
    }

    var medalhas = ['🥇', '🥈', '🥉'];
    var html     = '';

    ranking.forEach(function (item) {
      var posLabel  = item.posicao <= 3 ? medalhas[item.posicao - 1] : item.posicao;
      var voceClass = item.e_voce ? ' ranking-item--voce' : '';
      var voceBadge = item.e_voce
        ? '<span class="ranking-item__badge ranking-item__badge--voce">você</span>'
        : '';
      var nivelBadge = item.nivel
        ? '<span class="ranking-item__badge ranking-item__badge--nivel">' + item.nivel + '</span>'
        : '';

      html += '<li class="ranking-item' + voceClass + '">' +
        '<div class="ranking-item__barra" style="width:' + (item.barra_pct || 0) + '%"></div>' +
        '<span class="ranking-item__pos">' + posLabel + '</span>' +
        '<div class="ranking-item__avatar">' + (item.iniciais || '?') + '</div>' +
        '<div class="ranking-item__info">' +
          '<div class="ranking-item__nome">' + item.nome + voceBadge + nivelBadge + '</div>' +
          '<div class="ranking-item__detalhes">' +
            '<span>🌿 ' + fmtCo2(item.co2e_total)          + ' CO₂</span>' +
            '<span>⏱ '  + fmtTempo(item.tempo_min)         + '</span>' +
            '<span>⚡ '  + item.passagens + ' passagens</span>' +
          '</div>' +
        '</div>' +
        '<span class="ranking-item__co2">' + fmtCo2(item.co2e_total) + '</span>' +
      '</li>';
    });

    lista.innerHTML = html;
  }

  // ── Estado de erro / vazio ───────────────────────────────────────────────────

  function renderErro(msg) {
    var lista = document.getElementById('ranking-lista');
    if (lista) lista.innerHTML = '<li class="ranking-lista__loading">' + msg + '</li>';

    // Zera o hero sem apagar estrutura
    set('ranking-posicao-num', '#—');
    set('ranking-hero-co2',    '0');
    set('ranking-hero-nivel',  '🌿 Iniciante');
    set('ranking-lista-total', '— usuários');
    set('ranking-tempo',       '—');
    set('ranking-passagens',   '—');
    var fill = document.getElementById('ranking-progress-fill');
    if (fill) fill.style.width = '0%';
  }

  // ── Chamada à API ────────────────────────────────────────────────────────────

  function carregarRanking(periodo) {
    _periodoAtivo = periodo || _periodoAtivo;

    var lista = document.getElementById('ranking-lista');
    if (lista) lista.innerHTML = '<li class="ranking-lista__loading">Carregando ranking…</li>';

    fetch('/api/ranking/?periodo=' + _periodoAtivo, { credentials: 'same-origin' })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (data) {
        if (!data.ok) {
          renderErro(data.erro || 'Erro ao carregar dados.');
          return;
        }
        renderHero(data.usuario);
        renderLista(data.ranking);
      })
      .catch(function (err) {
        console.error('[ranking]', err);
        renderErro('Erro ao conectar. Recarregue a página.');
      });
  }

  // ── Inicialização ────────────────────────────────────────────────────────────

  function init() {
    // Botões de filtro de período
    var btns = document.querySelectorAll('.ranking-filtro-btn');
    btns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        btns.forEach(function (b) { b.classList.remove('ranking-filtro-btn--ativo'); });
        btn.classList.add('ranking-filtro-btn--ativo');
        carregarRanking(btn.dataset.periodo);
      });
    });

    // Carrega o período ativo inicial (botão com --ativo no HTML)
    var ativoEl = document.querySelector('.ranking-filtro-btn--ativo');
    var periodoInicial = ativoEl ? (ativoEl.dataset.periodo || 'mes') : 'mes';
    carregarRanking(periodoInicial);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();