/**
 * Taggy Seeds — Retrospectiva Anual
 * Dados reais da API /api/taggy-seeds/
 */
(function () {
  'use strict';

  var currentIndex = 0;
  var TOTAL = 5;

  // ── Formatadores ──────────────────────────────────────────────────────────

  function fmtCo2e(kg) {
    if (kg === 0)   return { valor: '0',                  unidade: 'kg CO2e' };
    if (kg < 0.001) return { valor: (kg*1e6).toFixed(0),  unidade: 'mg CO2e' };
    if (kg < 1)     return { valor: (kg*1000).toFixed(1), unidade: 'g CO2e'  };
    if (kg < 10)    return { valor: kg.toFixed(2),        unidade: 'kg CO2e' };
    return            { valor: parseFloat(kg.toFixed(1)).toString(), unidade: 'kg CO2e' };
  }

  function fmtLitros(l) {
    if (l === 0)   return '0L';
    if (l < 0.001) return (l * 1000).toFixed(1) + 'mL';
    if (l < 1)     return l.toFixed(2) + 'L';
    return parseFloat(l.toFixed(1)) + 'L';
  }

  function fmtTempo(h) {
    if (h === 0)      return '0 min';
    if (h < 1/60)     return Math.round(h * 3600) + 's';
    if (h < 1)        return Math.round(h * 60) + ' min';
    return parseFloat(h.toFixed(1)) + 'h';
  }

  function fmtPapeis(p) {
    if (p === 0) return '0';
    return parseFloat(p.toFixed(1)).toString();
  }

  function fmtArvores(a) {
    if (a === 0)   return '0';
    if (a < 0.01)  return a.toFixed(3);
    return parseFloat(a.toFixed(1)).toString();
  }

  function fmtComp(kg) {
    if (kg === 0) return '0';
    if (kg < 1)   return (kg * 1000).toFixed(1);
    return parseFloat(kg.toFixed(1)).toString();
  }

  function compUnidade(kg) {
    return kg < 1 ? 'g CO2e' : 'kg CO2e';
  }

  // ── Popular cards ─────────────────────────────────────────────────────────

  function populate(data) {
    var t   = data.total;
    var c   = data.comparativo_mensal;
    var n   = data.nivel;
    var ano = data.ano;

    // Card 1
    var co2fmt = fmtCo2e(t.co2e_kg);
    set('s-eyebrow',   'TOTAL CO2E EVITADO EM ' + ano);
    set('s-co2e',      co2fmt.valor);
    set('s-co2e-unit', co2fmt.unidade);

    var frase = t.passagens === 0
      ? 'Registre as primeiras passagens para comecar!'
      : t.co2e_kg < 1
        ? t.passagens + ' passagem(ns) registrada(s) - continue!'
        : 'Voce fez a diferenca no transito brasileiro';
    set('s-phrase-co2e', frase);

    // Card 2
    var maxComp = Math.max(c.mes_anterior_co2e, c.mes_atual_co2e);
    var titulo = c.mes_anterior_label === c.mes_atual_label
      ? c.mes_atual_label.toUpperCase()
      : c.mes_atual_label.toUpperCase() + ' VS ' + c.mes_anterior_label.toUpperCase();
    set('s-compare-title', titulo);
    set('s-mes-ant-label', c.mes_anterior_label);
    set('s-mes-at-label',  c.mes_atual_label);
    set('s-mes-ant-val',   fmtComp(c.mes_anterior_co2e));
    set('s-mes-at-val',    fmtComp(c.mes_atual_co2e));
    set('s-compare-unit',  compUnidade(maxComp));
    set('s-compare-msg',   c.mensagem);

    // Card 3
    set('s-arvores',    fmtArvores(t.arvores));
    set('s-combustivel', fmtLitros(t.combustivel_litros));
    set('s-tempo',      fmtTempo(t.tempo_horas));
    set('s-papeis',     fmtPapeis(t.papeis_evitados));

    // Card 4
    set('s-nivel-nome', n.nome);
    set('s-nivel-pts',
      n.pontos_para_proximo > 0
        ? n.pontos_para_proximo + ' pontos para o proximo nivel'
        : 'Nivel maximo atingido!');

    var ICON_MAP = { bolt: 'bolt', star: 'star', forest: 'forest', military_tech: 'military_tech' };
    var medalsEl = document.getElementById('s-medals');
    if (medalsEl && n.medalhas) {
      medalsEl.innerHTML = '';
      n.medalhas.forEach(function (m) {
        var div = document.createElement('div');
        div.className = 'seed-card__medal' + (m.ativo ? '' : ' seed-card__medal--inactive');
        var iconName = ICON_MAP[m.icone] || 'star';
        div.innerHTML = '<span class="material-symbols-outlined" style="font-size:1.8rem;">' + iconName + '</span>';
        medalsEl.appendChild(div);
      });
    }

    // Card 5
    set('s-share-kg',         co2fmt.valor + ' ' + co2fmt.unidade.split(' ')[0]);
    set('s-share-sub',        'de CO2e evitados em ' + ano);
    set('s-chip-arvores',     fmtArvores(t.arvores) + ' arvores');
    set('s-chip-combustivel', fmtLitros(t.combustivel_litros) + ' poupados');

    window._seedsData = data;
  }

  function set(id, val) {
    var el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  // ── Carousel ──────────────────────────────────────────────────────────────

  function goTo(idx) {
    var cards = document.querySelectorAll('.seed-card');
    var dots  = document.querySelectorAll('.seed-dot');
    cards.forEach(function (card, i) {
      card.classList.remove('active', 'prev');
      if (i === idx)     card.classList.add('active');
      else if (i < idx)  card.classList.add('prev');
    });
    dots.forEach(function (dot, i) {
      dot.classList.toggle('active', i === idx);
    });
    currentIndex = idx;
    var prev = document.getElementById('seeds-prev');
    var next = document.getElementById('seeds-next');
    if (prev) prev.disabled = (idx === 0);
    if (next) next.disabled = (idx === TOTAL - 1);
  }

  // ── Compartilhar ──────────────────────────────────────────────────────────

  function handleShare() {
    var d   = window._seedsData;
    var fmt = d ? fmtCo2e(d.total.co2e_kg) : { valor: '0', unidade: 'kg CO2e' };
    var ano = d ? d.ano : new Date().getFullYear();
    var txt = 'Evitei ' + fmt.valor + ' ' + fmt.unidade + ' em ' + ano + ' com TagGreen!\nConheca: taggy.com.br/impacto';
    if (navigator.share) {
      navigator.share({ title: 'Taggy Seeds', text: txt, url: 'https://taggy.com.br/impacto' })
        .catch(function () { copiar(txt); });
    } else {
      copiar(txt);
    }
  }

  function copiar(txt) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(txt)
        .then(function () { toast('Texto copiado!'); })
        .catch(function () { toast('Nao foi possivel copiar.'); });
    } else {
      toast('Compartilhamento nao disponivel neste navegador.');
    }
  }

  // ── Salvar imagem ─────────────────────────────────────────────────────────

  function handleSave() {
    var el = document.getElementById('card-share');
    if (!el) { toast('Card nao encontrado.'); return; }
    if (typeof html2canvas === 'undefined') { toast('Biblioteca nao carregada.'); return; }
    var ano = window._seedsData ? window._seedsData.ano : new Date().getFullYear();
    toast('Gerando imagem...');
    html2canvas(el, { backgroundColor: null, scale: 2, useCORS: true, logging: false })
      .then(function (canvas) {
        var a = document.createElement('a');
        a.download = 'taggy-seeds-' + ano + '.png';
        a.href = canvas.toDataURL('image/png');
        a.click();
        toast('Imagem salva!');
      })
      .catch(function () { toast('Erro ao gerar imagem.'); });
  }

  // ── Toast ─────────────────────────────────────────────────────────────────

  function toast(msg) {
    var el = document.getElementById('seeds-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'seeds-toast';
      el.className = 'seeds-toast';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(el._t);
    el._t = setTimeout(function () { el.classList.remove('show'); }, 3500);
  }

  // ── Carregar dados da API ──────────────────────────────────────────────────

  function loadData() {
    fetch('/api/taggy-seeds/', { credentials: 'same-origin' })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (data) {
        populate(data);
      })
      .catch(function (err) {
        console.error('[Taggy Seeds] Erro:', err);
        set('s-co2e',       '—');
        set('s-co2e-unit',  '');
        set('s-phrase-co2e', 'Nao foi possivel carregar seus dados. Recarregue a pagina.');
        toast('Erro ao carregar dados.');
      });
  }

  // ── Init ──────────────────────────────────────────────────────────────────

  function init() {
    var btnPrev  = document.getElementById('seeds-prev');
    var btnNext  = document.getElementById('seeds-next');
    var btnShare = document.getElementById('seeds-share');
    var btnSave  = document.getElementById('seeds-save');

    if (btnPrev) {
      btnPrev.addEventListener('click', function () {
        if (currentIndex > 0) goTo(currentIndex - 1);
      });
    }
    if (btnNext) {
      btnNext.addEventListener('click', function () {
        if (currentIndex < TOTAL - 1) goTo(currentIndex + 1);
      });
    }

    document.querySelectorAll('.seed-dot').forEach(function (dot, i) {
      dot.addEventListener('click', function () { goTo(i); });
    });

    if (btnShare) btnShare.addEventListener('click', handleShare);
    if (btnSave)  btnSave.addEventListener('click',  handleSave);

    // Swipe mobile
    var startX = 0;
    var carousel = document.querySelector('.seeds-carousel');
    if (carousel) {
      carousel.addEventListener('touchstart', function (e) {
        startX = e.touches[0].clientX;
      }, { passive: true });
      carousel.addEventListener('touchend', function (e) {
        var diff = startX - e.changedTouches[0].clientX;
        if (Math.abs(diff) > 50) {
          if (diff > 0 && currentIndex < TOTAL - 1) goTo(currentIndex + 1);
          else if (diff < 0 && currentIndex > 0)    goTo(currentIndex - 1);
        }
      });
    }

    goTo(0);
    loadData();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
