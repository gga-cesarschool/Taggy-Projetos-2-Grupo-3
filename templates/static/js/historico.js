/**
 * TagGreen — Histórico de Atividades
 * Consome /api/historico/ — sem nenhum dado chumbado.
 */
(function () {
  'use strict';

  // ── Utilitários ──────────────────────────────────────────────────────────

  function getCsrf() { return window._CSRF || ''; }
  function esc(s)    { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function fmt(n, d) { return Number(n).toFixed(d === undefined ? 1 : d).replace('.', ','); }

  function fmtCo2(kg) {
    if (!kg || kg === 0) return '<span>0 g</span>';
    if (kg < 0.001) return '<span>' + fmt(kg * 1e6, 0) + '</span><small> mg</small>';
    if (kg < 1)     return '<span>' + fmt(kg * 1000, 0) + '</span><small> g</small>';
    return '<span>' + fmt(kg) + '</span><small> kg</small>';
  }

  function fmtTempo(min) {
    if (!min || min === 0) return '<span>0</span><small> min</small>';
    var h   = Math.floor(min / 60);
    var m   = Math.round(min % 60);
    if (h > 0 && m > 0) return '<span>' + h + '</span><small>h </small><span>' + m + '</span><small> min</small>';
    if (h > 0) return '<span>' + fmt(min / 60) + '</span><small> h</small>';
    return '<span>' + Math.round(min) + '</span><small> min</small>';
  }

  function set(id, val) {
    var el = document.getElementById(id);
    if (el) el.textContent = val;
  }
  function setHtml(id, html) {
    var el = document.getElementById(id);
    if (el) el.innerHTML = html;
  }

  var ICON_CONTEXTO = {
    pedagio:           'directions_car',
    estacionamento:    'local_parking',
    acesso_controlado: 'security',
  };

  // ── Estado ───────────────────────────────────────────────────────────────

  var _periodo = 'mes';
  var _tipo    = 'todos';
  var _busca   = '';
  var _dataIni = '';
  var _dataFim = '';
  var _conquistas = [];
  var _debounce   = null;

  // ── KPIs ─────────────────────────────────────────────────────────────────

  var PERIODO_LABELS = {
    mes: 'este mês', trimestre: 'últimos 3 meses', ano: 'este ano', personalizado: 'período'
  };

  function renderKpis(kpis) {
    var lbl = PERIODO_LABELS[_periodo] || 'período';
    document.querySelectorAll('.hist-kpi__badge[id]').forEach(function (el) {
      if (el.id !== 'kpi-mes-sustentavel') el.textContent = lbl;
    });
    setHtml('kpi-co2e',      fmtCo2(kpis.co2e_periodo));
    set('kpi-passagens',     kpis.qtd_periodo);
    setHtml('kpi-tempo',     fmtTempo(kpis.tempo_min));
    if (kpis.mes_sustentavel) {
      var ms = kpis.mes_sustentavel;
      document.getElementById('kpi-mes-sustentavel').innerHTML =
        '<span>' + esc(ms.abrev) + '</span><small class="hist-kpi__label-suf"> ' + esc(ms.nome.slice(ms.abrev.length)) + '</small>';
    } else {
      set('kpi-mes-sustentavel', '—');
    }
  }

  // ── Nível ─────────────────────────────────────────────────────────────────

  function renderNivel(nivel) {
    var nomeCompleto = 'Nível ' + nivel.numero + ' — ' + nivel.nome;
    set('nivel-nome', nomeCompleto);
    set('nivel-pct',  nivel.progresso_pct + '%');

    var barEl = document.getElementById('nivel-bar');
    if (barEl) barEl.style.width = nivel.progresso_pct + '%';

    if (nivel.proximo_numero) {
      set('nivel-prox-label', 'Progresso para Nível ' + nivel.proximo_numero);
      var faltamEl = document.getElementById('nivel-faltam');
      if (faltamEl)
        faltamEl.innerHTML = 'Faltam <strong>' + fmt(nivel.faltam_kg) + ' kg</strong> de CO₂e evitado para chegar ao Nível ' + nivel.proximo_numero;
    } else {
      set('nivel-prox-label', 'Nível máximo atingido!');
      set('nivel-faltam',     '🏆 Você chegou ao topo!');
    }
  }

  // ── Lista de atividades ──────────────────────────────────────────────────

  function renderLista(atividades, total) {
    var lista = document.getElementById('hist-list');
    var count = document.getElementById('hist-list-count');
    if (count) count.textContent = total + ' registro' + (total !== 1 ? 's' : '');

    if (!atividades || atividades.length === 0) {
      lista.innerHTML =
        '<div class="hist-empty">' +
          '<span class="material-symbols-outlined hist-empty__icon">history</span>' +
          '<span class="hist-empty__title">Nenhuma atividade encontrada</span>' +
          '<span class="hist-empty__text">Registre passagens para ver seu histórico aqui.</span>' +
        '</div>';
      return;
    }

    var html = '';
    atividades.forEach(function (a) {
      var icon    = esc(ICON_CONTEXTO[a.contexto] || 'receipt');
      var titulo  = esc(a.contexto_label);
      if (a.empresa_nome) titulo += ' · ' + esc(a.empresa_nome);
      else if (a.veiculo_nome) titulo += ' · ' + esc(a.veiculo_nome);

      var badge = '';
      if (a.badge === 'Eco+')     badge = '<span class="hist-item__badge hist-item__badge--eco">Eco+</span>';
      else if (a.badge === 'Iniciante') badge = '<span class="hist-item__badge hist-item__badge--inic">Iniciante</span>';

      var co2Html = a.co2e_g >= 1000
        ? fmt(a.co2e_total) + ' kg'
        : fmt(a.co2e_g, 0) + ' g';

      html +=
        '<div class="hist-item" data-id="' + a.id + '">' +
          '<div class="hist-item__icon"><span class="material-symbols-outlined">' + icon + '</span></div>' +
          '<div class="hist-item__info">' +
            '<div class="hist-item__titulo">' + titulo + '</div>' +
            '<div class="hist-item__data">📅 ' + esc(a.data_fmt) +
              (a.quantidade > 1 ? ' · ' + a.quantidade + '× passagens' : '') + '</div>' +
          '</div>' +
          '<div class="hist-item__meta">' + badge +
            '<span class="hist-item__co2">' + co2Html + ' CO₂</span>' +
          '</div>' +
          '<button class="hist-item__del" data-del="' + a.id + '" title="Excluir passagem">' +
            '<span class="material-symbols-outlined">delete</span>' +
          '</button>' +
        '</div>';
    });

    lista.innerHTML = html;

    lista.querySelectorAll('[data-del]').forEach(function (btn) {
      btn.addEventListener('click', function () { excluirPassagem(parseInt(btn.dataset.del)); });
    });
  }

  // ── Modal de conquistas ──────────────────────────────────────────────────

  var CONQUISTA_ICONES = {
    'Primeira Passagem':  'bolt',
    '100 Passagens':      'emoji_events',
    'Eco Warrior':        'eco',
    '500 Passagens':      'emoji_events',
    '1 Tonelada Evitada': 'forest',
  };

  function renderConquistas(conquistas) {
    var body = document.getElementById('hist-modal-body');
    if (!body) return;
    var html = '';
    conquistas.forEach(function (c) {
      var icon  = esc(CONQUISTA_ICONES[c.titulo] || 'star');
      var cls   = c.ativa ? 'conquista-item--ativa' : 'conquista-item--inativa';
      html +=
        '<div class="conquista-item ' + cls + '">' +
          '<div class="conquista-item__icon"><span class="material-symbols-outlined">' + icon + '</span></div>' +
          '<div class="conquista-item__info">' +
            '<span class="conquista-item__titulo">' + esc(c.titulo) + '</span>' +
            '<span class="conquista-item__desc">' + esc(c.descricao || '') + '</span>' +
          '</div>' +
        '</div>';
    });
    body.innerHTML = html || '<p style="padding:1.6rem;color:#718096">Nenhuma conquista registrada.</p>';
  }

  function abrirModal() {
    var m = document.getElementById('hist-modal');
    if (m) { renderConquistas(_conquistas); m.hidden = false; }
  }

  function fecharModal() {
    var m = document.getElementById('hist-modal');
    if (m) m.hidden = true;
  }

  // ── Excluir passagem ─────────────────────────────────────────────────────

  function excluirPassagem(id) {
    if (!confirm('Excluir esta passagem?')) return;
    fetch('/api/passagens/' + id + '/excluir/', {
      method: 'POST',
      headers: { 'X-CSRFToken': getCsrf() },
      credentials: 'same-origin',
    })
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (d.ok) carregarHistorico();
      else alert(d.erro || 'Erro ao excluir.');
    })
    .catch(function () { alert('Erro de conexão.'); });
  }

  // ── Chamada principal à API ──────────────────────────────────────────────

  function carregarHistorico() {
    var params = new URLSearchParams({
      periodo: _periodo,
      tipo:    _tipo,
      busca:   _busca,
    });
    if (_periodo === 'personalizado') {
      if (_dataIni) params.set('data_inicio', _dataIni);
      if (_dataFim) params.set('data_fim',    _dataFim);
    }

    var lista = document.getElementById('hist-list');
    if (lista) lista.innerHTML =
      '<div class="hist-loading">' +
        '<span class="material-symbols-outlined hist-loading__icon">history</span>' +
        '<span class="hist-loading__title">Carregando…</span>' +
      '</div>';

    fetch('/api/historico/?' + params.toString(), { credentials: 'same-origin' })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (data) {
        if (!data.ok) { console.error('[historico]', data.erro); return; }
        _conquistas = data.conquistas || [];
        renderKpis(data.kpis);
        renderNivel(data.nivel);
        renderLista(data.atividades, data.total_registros);
      })
      .catch(function (err) {
        console.error('[historico]', err);
        var l = document.getElementById('hist-list');
        if (l) l.innerHTML =
          '<div class="hist-empty">' +
            '<span class="hist-empty__title">Erro ao carregar dados</span>' +
            '<span class="hist-empty__text">Recarregue a página ou tente novamente.</span>' +
          '</div>';
      });
  }

  // ── Inicialização ─────────────────────────────────────────────────────────

  // ── Hamburger (menu mobile) ──────────────────────────────────────────────

  function initHamburger() {
    var btn = document.getElementById('hamburger-btn');
    var nav = document.getElementById('main-nav');
    if (!btn || !nav) return;
    btn.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      btn.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', String(open));
    });
  }

  function init() {
    initHamburger();

    var hoje = new Date().toISOString().split('T')[0];
    var inicio = document.getElementById('hist-date-end');
    if (inicio) inicio.value = hoje;
    var fimEl = document.getElementById('hist-date-start');
    if (fimEl) fimEl.value = hoje.slice(0, 7) + '-01';

    // Filtros de período
    document.querySelectorAll('[data-periodo]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('[data-periodo]').forEach(function (b) { b.classList.remove('hist-tab--active'); });
        btn.classList.add('hist-tab--active');
        _periodo = btn.dataset.periodo;
        var range = document.getElementById('hist-date-range');
        if (range) range.hidden = (_periodo !== 'personalizado');
        if (_periodo !== 'personalizado') carregarHistorico();
      });
    });

    // Aplicar datas personalizadas
    var applyBtn = document.getElementById('hist-apply-dates');
    if (applyBtn) applyBtn.addEventListener('click', function () {
      _dataIni = document.getElementById('hist-date-start').value;
      _dataFim = document.getElementById('hist-date-end').value;
      if (_dataIni && _dataFim) carregarHistorico();
    });

    // Filtros de tipo
    document.querySelectorAll('[data-tipo]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('[data-tipo]').forEach(function (b) { b.classList.remove('hist-tab--active'); });
        btn.classList.add('hist-tab--active');
        _tipo = btn.dataset.tipo;
        carregarHistorico();
      });
    });

    // Busca com debounce
    var searchEl = document.getElementById('hist-search');
    if (searchEl) searchEl.addEventListener('input', function () {
      clearTimeout(_debounce);
      _busca = searchEl.value.trim();
      _debounce = setTimeout(carregarHistorico, 400);
    });

    // Modal de conquistas
    ['hist-ver-conquistas', 'hist-ver-conquistas-2'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener('click', abrirModal);
    });

    var closeBtn = document.getElementById('hist-modal-close');
    if (closeBtn) closeBtn.addEventListener('click', fecharModal);

    var modal = document.getElementById('hist-modal');
    if (modal) modal.addEventListener('click', function (e) {
      if (e.target === modal) fecharModal();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && modal && !modal.hidden) fecharModal();
    });

    // Carga inicial
    carregarHistorico();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();