// =============================================
// TagGreen — Meu Impacto
// Dados reais · Passagens · Veículos · Charts
// =============================================

(function () {
  'use strict';

  function getCsrf()         { return window._CSRF || ''; }
  function esc(s)            { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function fmt(n, d = 1)    { return Number(n).toFixed(d).replace('.', ','); }
  function fmtKg(kg)        { return kg >= 1 ? fmt(kg) + ' kg' : fmt(kg * 1000, 0) + ' g'; }
  function fmtTempo(min)    { return min >= 60 ? fmt(min / 60) + ' h' : fmt(min, 0) + ' min'; }

  // ── Cálculo de CO₂e (espelha views.py) ─────────────────────────────────
  const CALC = {
    fatores:  { gasolina:2.212, diesel:2.603, flex_mix:1.335, grid_br:0.0817, papel:1.100 },
    veiculos: {
      carro_combustao: { combustivel:'flex_mix',  consumo_km:0.090, consumo_idle:0.65 },
      carro_eletrico:  { combustivel:'grid_br',   consumo_km:0.180, consumo_idle:0.15 },
      moto:            { combustivel:'gasolina',  consumo_km:0.038, consumo_idle:0.28 },
      caminhao:        { combustivel:'diesel',    consumo_km:0.300, consumo_idle:2.40 },
    },
    contextos: {
      pedagio:           { tempo_sem:3.0, tempo_com:0.05, dist_sem:0.100, dist_com:0.031, papel_sem:5.0 },
      estacionamento:    { tempo_sem:1.5, tempo_com:0.05, dist_sem:0.050, dist_com:0.010, papel_sem:8.0 },
      acesso_controlado: { tempo_sem:1.0, tempo_com:0.05, dist_sem:0.030, dist_com:0.010, papel_sem:4.0 },
    },
  };

  function calcCo2ePorPassagem(tipoVeiculo, contexto) {
    const v = CALC.veiculos[tipoVeiculo];
    const c = CALC.contextos[contexto];
    if (!v || !c) return 0;
    const f    = CALC.fatores[v.combustivel];
    const eSem = (c.tempo_sem / 60) * v.consumo_idle * f + c.dist_sem * v.consumo_km * f + (c.papel_sem / 1000) * CALC.fatores.papel;
    const eCom = (c.tempo_com / 60) * v.consumo_idle * f + c.dist_com * v.consumo_km * f;
    return eSem - eCom;
  }

  // ── Cache de veículos (compartilhado pelos dois modais) ─────────────────
  let _veiculosCache = [];

  // ==========================================================================
  // DASHBOARD — carrega KPIs e gráficos reais
  // ==========================================================================

  let _chartMonthly = null;
  let _chartAnnual  = null;

  async function carregarDashboard() {
    try {
      const res  = await fetch('/api/meu-impacto/dados/');
      const data = await res.json();
      if (!data.ok) return;

      // Greeting
      const g = document.getElementById('greeting-title');
      if (g) g.textContent = `Olá, ${data.nome}! 👋`;

      // KPIs
      const co2e = data.kpis.co2e_mes;
      const tot  = data.kpis.co2e_total;
      _setKpi('kpi-co2e-mes',  fmtKg(co2e));
      _setKpi('kpi-passagens', data.kpis.qtd_mes);
      _setKpi('kpi-total',     fmtKg(tot));
      _setKpi('kpi-tempo',     fmtTempo(data.kpis.tempo_mes));

      // Charts
      _initCharts(data.grafico_mensal, data.grafico_anual);

    } catch (e) {
      console.error('[dashboard]', e);
      _initCharts(null, null); // sem dados = gráficos vazios
    }
  }

  function _setKpi(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  function _initCharts(mensal, anual) {
    if (typeof Chart === 'undefined') return;

    const monthlyCtx = document.getElementById('monthlyChart');
    const annualCtx  = document.getElementById('annualChart');

    const labMes  = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    const dataMes = mensal?.data || Array(12).fill(0);
    const labAno  = anual?.labels  || [String(new Date().getFullYear())];
    const dataAno = anual?.data    || [0];

    if (monthlyCtx) {
      _chartMonthly?.destroy();
      _chartMonthly = new Chart(monthlyCtx, {
        type: 'bar',
        data: {
          labels: labMes,
          datasets: [{
            label: 'kg CO₂e evitados',
            data: dataMes,
            backgroundColor: ctx => ctx.dataIndex === new Date().getMonth() ? '#1B5E20' : '#4CAF50',
            borderRadius: 6,
            borderSkipped: false,
          }],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { ticks: { callback: v => v + ' kg', font: { size: 11 } }, grid: { color: 'rgba(0,0,0,.06)' } },
            x: { grid: { display: false } },
          },
        },
      });
    }

    if (annualCtx) {
      _chartAnnual?.destroy();
      _chartAnnual = new Chart(annualCtx, {
        type: 'line',
        data: {
          labels: labAno,
          datasets: [{
            label: 'kg CO₂e',
            data: dataAno,
            borderColor: '#2E7D32',
            backgroundColor: 'rgba(46,125,50,.08)',
            borderWidth: 2.5, fill: true, tension: 0.35,
            pointBackgroundColor: '#2E7D32', pointRadius: 5,
          }],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { ticks: { callback: v => v + ' kg', font: { size: 11 } }, grid: { color: 'rgba(0,0,0,.06)' } },
            x: { grid: { display: false } },
          },
        },
      });
    }
  }

  // ==========================================================================
  // MODAL PASSAGEM
  // ==========================================================================

  function _pmModal()    { return document.getElementById('pm-modal'); }
  function _pmVeiculo()  { return document.getElementById('pm-veiculo'); }
  function _pmContexto() { return document.querySelector('[name="pm-contexto"]:checked'); }

  function _atualizarPreviewPassagem() {
    const selVei = _pmVeiculo();
    const selCtx = _pmContexto();
    const qtdEl  = document.getElementById('pm-qtd');
    const prev   = document.getElementById('pm-preview');
    const prevVal = document.getElementById('pm-preview-val');

    if (!selVei || !selCtx || !qtdEl || !prev) return;

    const veiculo  = _veiculosCache.find(v => v.id === parseInt(selVei.value));
    const contexto = selCtx.value;
    const qtd      = parseInt(qtdEl.value) || 1;

    if (!veiculo || !contexto) { prev.hidden = true; return; }

    const co2e     = calcCo2ePorPassagem(veiculo.tipo, contexto);
    const total    = co2e * qtd;
    const totalG   = total * 1000;

    prevVal.textContent = totalG >= 1000
      ? fmt(total) + ' kg'
      : fmt(totalG, 1) + ' g';

    const labelEl = prev.querySelector('.pm-preview__unit');
    if (labelEl) labelEl.textContent = totalG >= 1000 ? '' : 'CO₂e';

    prev.hidden = false;
  }

  function _popularEmpresasPassagem(veiculo) {
    const sel = document.getElementById('pm-empresa');
    if (!sel) return;
    sel.innerHTML = '<option value="">Nenhuma selecionada</option>';
    if (!veiculo?.empresas?.length) return;
    veiculo.empresas.forEach(e => {
      const opt = document.createElement('option');
      opt.value       = e.id;
      opt.textContent = e.nome + (e.tipo_servico_label ? ` (${e.tipo_servico_label})` : '');
      sel.appendChild(opt);
    });
  }

  function _preSelectContexto(veiculo) {
    if (!veiculo?.empresas?.length) return;
    const ts = veiculo.empresas[0].tipo_servico;
    const mapa = { pedagio: 'pedagio', estacionamento: 'estacionamento', acesso_controlado: 'acesso_controlado' };
    const radio = document.querySelector(`[name="pm-contexto"][value="${mapa[ts] || 'pedagio'}"]`);
    if (radio) radio.checked = true;
  }

  function abrirModalPassagem(veiculoIdPreSel = null) {
    const modal = _pmModal();
    if (!modal) return;

    // Reset
    const veiSel = _pmVeiculo();
    const qtdEl  = document.getElementById('pm-qtd');
    const dataEl = document.getElementById('pm-data');

    if (veiSel)  veiSel.value  = veiculoIdPreSel || '';
    if (qtdEl)   qtdEl.value   = '1';
    if (dataEl)  dataEl.value  = new Date().toISOString().split('T')[0];

    document.querySelectorAll('[name="pm-contexto"]').forEach(r => r.checked = false);
    document.getElementById('pm-preview').hidden = true;
    document.getElementById('pm-alert').classList.remove('show');
    document.getElementById('pm-success').classList.remove('show');
    document.getElementById('pm-veiculo-err').classList.remove('show');
    document.getElementById('pm-ctx-err').classList.remove('show');

    // Popula select de veículos
    if (veiSel) {
      veiSel.innerHTML = '<option value="">Selecione um veículo...</option>';
      _veiculosCache.forEach(v => {
        const opt = document.createElement('option');
        opt.value       = v.id;
        opt.textContent = v.nome + (v.placa ? ` · ${v.placa}` : '');
        if (veiculoIdPreSel && v.id === veiculoIdPreSel) opt.selected = true;
        veiSel.appendChild(opt);
      });
      // Se pré-selecionado, já popula empresas e contexto
      if (veiculoIdPreSel) {
        const v = _veiculosCache.find(x => x.id === veiculoIdPreSel);
        if (v) { _popularEmpresasPassagem(v); _preSelectContexto(v); }
      }
    }

    modal.hidden = false;
  }

  function fecharModalPassagem() {
    const m = _pmModal();
    if (m) m.hidden = true;
  }

  async function salvarPassagem() {
    const btnSave = document.getElementById('pm-save');
    const alertEl = document.getElementById('pm-alert');
    const sucEl   = document.getElementById('pm-success');
    const veiErr  = document.getElementById('pm-veiculo-err');
    const ctxErr  = document.getElementById('pm-ctx-err');

    alertEl.classList.remove('show');
    sucEl.classList.remove('show');
    veiErr.classList.remove('show');
    ctxErr.classList.remove('show');

    const veiculoId = parseInt(document.getElementById('pm-veiculo').value);
    const contexto  = document.querySelector('[name="pm-contexto"]:checked')?.value;
    const data      = document.getElementById('pm-data').value;
    const quantidade = parseInt(document.getElementById('pm-qtd').value) || 1;
    const empresaId  = document.getElementById('pm-empresa').value || null;

    let ok = true;
    if (!veiculoId) {
      veiErr.textContent = 'Selecione um veículo.';
      veiErr.classList.add('show');
      ok = false;
    }
    if (!contexto) {
      ctxErr.textContent = 'Selecione o tipo de passagem.';
      ctxErr.classList.add('show');
      ok = false;
    }
    if (!ok) return;

    btnSave.disabled = true;
    try {
      const res  = await fetch('/api/passagens/registrar/', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrf() },
        body:    JSON.stringify({ veiculo_id: veiculoId, contexto, data, quantidade, empresa_id: empresaId }),
      });
      const d = await res.json();
      if (d.ok) {
        sucEl.textContent = d.mensagem || 'Passagem registrada com sucesso!';
        sucEl.classList.add('show');
        // Recarrega KPIs e gráficos
        await carregarDashboard();
        // Fecha após 1.5s
        setTimeout(fecharModalPassagem, 1500);
      } else {
        alertEl.textContent = d.erro || 'Erro ao registrar.';
        alertEl.classList.add('show');
      }
    } catch {
      alertEl.textContent = 'Erro de conexão. Tente novamente.';
      alertEl.classList.add('show');
    } finally {
      btnSave.disabled = false;
    }
  }

  function initPassagens() {
    const btnAbrir = document.getElementById('btn-passagem');
    if (btnAbrir) btnAbrir.addEventListener('click', () => abrirModalPassagem());

    ['pm-close', 'pm-cancel'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('click', fecharModalPassagem);
    });

    const modal = _pmModal();
    if (modal) modal.addEventListener('click', e => { if (e.target === modal) fecharModalPassagem(); });

    document.getElementById('pm-save')?.addEventListener('click', salvarPassagem);

    // Atualiza empresas e pre-seleciona contexto ao trocar veículo
    document.getElementById('pm-veiculo')?.addEventListener('change', e => {
      const v = _veiculosCache.find(x => x.id === parseInt(e.target.value));
      _popularEmpresasPassagem(v);
      if (v) _preSelectContexto(v);
      _atualizarPreviewPassagem();
    });

    // Atualiza preview em tempo real
    document.querySelectorAll('[name="pm-contexto"]').forEach(r =>
      r.addEventListener('change', _atualizarPreviewPassagem)
    );
    document.getElementById('pm-qtd')?.addEventListener('input', _atualizarPreviewPassagem);

    // Escape fecha
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && !_pmModal()?.hidden) fecharModalPassagem();
    });
  }

  // ==========================================================================
  // VEÍCULOS
  // ==========================================================================

  const TIPO_ICON = { carro_combustao:'directions_car', carro_eletrico:'electric_car', moto:'two_wheeler', caminhao:'local_shipping' };

  async function carregarVeiculos() {
    const list = document.getElementById('veiculo-list');
    if (!list) return;
    try {
      const res  = await fetch('/api/veiculos/');
      const data = await res.json();
      _veiculosCache = data.ok ? data.veiculos : [];

      if (!_veiculosCache.length) {
        list.innerHTML = '<li class="veiculo-empty">Nenhum veículo cadastrado.</li>';
        return;
      }

      list.innerHTML = _veiculosCache.map(v => `
        <li class="veiculo-item" data-id="${v.id}">
          <span class="veiculo-item__icon">
            <span class="material-symbols-outlined">${esc(TIPO_ICON[v.tipo] || 'directions_car')}</span>
          </span>
          <div class="veiculo-item__info">
            <strong>${esc(v.nome)}</strong>
            <span>${esc(v.tipo_label)}${v.placa ? ' · ' + esc(v.placa) : ''}</span>
            ${v.empresas.length ? `<div class="veiculo-item__tags">${v.empresas.map(e => `<span class="veiculo-item__tag">${esc(e.nome)}</span>`).join('')}</div>` : ''}
          </div>
          <div class="veiculo-item__actions">
            <button class="veiculo-item__action" data-action="passagem" data-id="${v.id}" title="Registrar passagem" style="color:#2E7D32;border-color:#c8e6c9">
              <span class="material-symbols-outlined">receipt</span>
            </button>
            <button class="veiculo-item__action" data-action="editar" data-id="${v.id}" title="Editar">
              <span class="material-symbols-outlined">edit</span>
            </button>
            <button class="veiculo-item__action veiculo-item__action--del" data-action="excluir" data-id="${v.id}" title="Excluir">
              <span class="material-symbols-outlined">delete</span>
            </button>
          </div>
        </li>`).join('');

      list.querySelectorAll('[data-action]').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = parseInt(btn.dataset.id);
          if (btn.dataset.action === 'editar')   abrirModalVeiculo(id);
          if (btn.dataset.action === 'excluir')  excluirVeiculo(id, btn.closest('li'));
          if (btn.dataset.action === 'passagem') abrirModalPassagem(id);
        });
      });

    } catch {
      list.innerHTML = '<li class="veiculo-empty">Erro ao carregar veículos.</li>';
    }
  }

  // ── Modal veículo (cache de empresas) ──────────────────────────────────
  let _empresasCache = null;

  const vmModal   = () => document.getElementById('vm-modal');

  async function carregarEmpresas() {
    if (_empresasCache) return _empresasCache;
    try {
      const res  = await fetch('/api/empresas/lista/');
      const data = await res.json();
      _empresasCache = data.ok ? data.grupos : {};
    } catch { _empresasCache = {}; }
    return _empresasCache;
  }

  async function renderizarEmpresasModal(selecionados = []) {
    const container = document.getElementById('vm-empresas-list');
    if (!container) return;
    container.innerHTML = '<p class="vm-emp-vazio">Carregando...</p>';
    const grupos = await carregarEmpresas();
    const keys   = Object.keys(grupos);
    if (!keys.length) { container.innerHTML = '<p class="vm-emp-vazio">Nenhuma empresa cadastrada ainda.</p>'; return; }
    container.innerHTML = keys.map(k => {
      const g = grupos[k];
      return `<div class="vm-emp-grupo"><span class="vm-emp-grupo-label">${esc(g.label)}</span>
        ${g.items.map(emp => `
          <label class="vm-emp-item">
            <input type="checkbox" value="${emp.id}" ${selecionados.includes(emp.id) ? 'checked' : ''}>
            <span>${esc(emp.nome)}</span>
          </label>`).join('')}
      </div>`;
    }).join('');
  }

  async function abrirModalVeiculo(veiculoId = null) {
    const modal = vmModal();
    if (!modal) return;
    document.getElementById('vm-id').value     = '';
    document.getElementById('vm-nome').value   = '';
    document.getElementById('vm-placa').value  = '';
    document.querySelectorAll('[name="vm-tipo"]').forEach(r => r.checked = false);
    document.getElementById('vm-alert').classList.remove('show');
    document.getElementById('vm-nome-err').classList.remove('show');
    document.getElementById('vm-tipo-err').classList.remove('show');
    document.getElementById('vm-title').textContent = veiculoId ? 'Editar veículo' : 'Adicionar veículo';

    if (veiculoId) {
      try {
        const res  = await fetch('/api/veiculos/');
        const data = await res.json();
        const v    = data.veiculos.find(x => x.id === veiculoId);
        if (v) {
          document.getElementById('vm-id').value    = v.id;
          document.getElementById('vm-nome').value  = v.nome;
          document.getElementById('vm-placa').value = v.placa;
          const radio = document.querySelector(`[name="vm-tipo"][value="${v.tipo}"]`);
          if (radio) radio.checked = true;
          await renderizarEmpresasModal(v.empresas.map(e => e.id));
        }
      } catch { /* ignora */ }
    } else {
      await renderizarEmpresasModal();
    }
    modal.hidden = false;
  }

  function fecharModalVeiculo() {
    const m = vmModal();
    if (m) m.hidden = true;
  }

  async function salvarVeiculo() {
    const btnSave = document.getElementById('vm-save');
    const alertEl = document.getElementById('vm-alert');
    const nomeErr = document.getElementById('vm-nome-err');
    const tipoErr = document.getElementById('vm-tipo-err');
    alertEl.classList.remove('show');
    nomeErr.classList.remove('show');
    tipoErr.classList.remove('show');
    document.getElementById('vm-nome').classList.remove('error');

    const id      = document.getElementById('vm-id').value;
    const nome    = document.getElementById('vm-nome').value.trim();
    const placa   = document.getElementById('vm-placa').value.trim().toUpperCase();
    const tipoR   = document.querySelector('[name="vm-tipo"]:checked');
    const tipo    = tipoR ? tipoR.value : '';
    const empresas = [...document.querySelectorAll('#vm-empresas-list input[type=checkbox]:checked')].map(cb => parseInt(cb.value));

    let ok = true;
    if (!nome) { nomeErr.textContent = 'Informe o nome do veículo.'; nomeErr.classList.add('show'); document.getElementById('vm-nome').classList.add('error'); ok = false; }
    if (!tipo) { tipoErr.textContent = 'Selecione o tipo do veículo.'; tipoErr.classList.add('show'); ok = false; }
    if (!ok) return;

    btnSave.disabled = true;
    try {
      const res  = await fetch('/api/veiculos/salvar/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrf() },
        body: JSON.stringify({ id: id ? parseInt(id) : null, nome, tipo, placa, empresas }),
      });
      const d = await res.json();
      if (d.ok) { fecharModalVeiculo(); await carregarVeiculos(); }
      else { alertEl.textContent = d.erro || 'Erro ao salvar.'; alertEl.classList.add('show'); }
    } catch { alertEl.textContent = 'Erro de conexão.'; alertEl.classList.add('show'); }
    finally { btnSave.disabled = false; }
  }

  async function excluirVeiculo(id, liEl) {
    if (!confirm('Excluir este veículo e todas as suas passagens?')) return;
    try {
      const res  = await fetch(`/api/veiculos/${id}/excluir/`, { method: 'POST', headers: { 'X-CSRFToken': getCsrf() } });
      const d = await res.json();
      if (d.ok) {
        liEl?.remove();
        _veiculosCache = _veiculosCache.filter(v => v.id !== id);
        const list = document.getElementById('veiculo-list');
        if (list && !list.querySelector('.veiculo-item')) list.innerHTML = '<li class="veiculo-empty">Nenhum veículo cadastrado.</li>';
      } else { alert(d.erro || 'Erro ao excluir.'); }
    } catch { alert('Erro de conexão.'); }
  }

  function initVeiculos() {
    carregarVeiculos();
    document.getElementById('add-veiculo-btn')?.addEventListener('click', () => abrirModalVeiculo(null));
    ['vm-close', 'vm-cancel'].forEach(id => {
      document.getElementById(id)?.addEventListener('click', fecharModalVeiculo);
    });
    const modal = vmModal();
    if (modal) modal.addEventListener('click', e => { if (e.target === modal) fecharModalVeiculo(); });
    document.getElementById('vm-save')?.addEventListener('click', salvarVeiculo);
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && !vmModal()?.hidden) fecharModalVeiculo();
    });
  }

  // ==========================================================================
  // WRAPPED MODAL
  // ==========================================================================

  function initWrappedModal() {
    const btnOpen  = document.getElementById('btn-wrapped');
    const modal    = document.getElementById('wrapped-modal');
    const overlay  = document.getElementById('wrapped-overlay');
    const btnClose = document.getElementById('wrapped-close');
    if (!btnOpen || !modal) return;
    const open  = () => modal.classList.add('is-open');
    const close = () => modal.classList.remove('is-open');
    btnOpen.addEventListener('click', open);
    btnClose?.addEventListener('click', close);
    overlay?.addEventListener('click', close);
  }

  // ==========================================================================
  // HAMBURGER
  // ==========================================================================

  function initHamburger() {
    const btn = document.getElementById('hamburger-btn');
    const nav = document.getElementById('main-nav');
    if (btn && nav) {
      btn.addEventListener('click', () => {
        const open = nav.classList.toggle('is-open');
        btn.classList.toggle('is-open', open);
        btn.setAttribute('aria-expanded', String(open));
      });
    }
  }

  // ==========================================================================
  // INIT
  // ==========================================================================

  document.addEventListener('DOMContentLoaded', () => {
    try { initHamburger();     } catch (e) { console.error('[hamburger]',  e); }
    try { initWrappedModal();  } catch (e) { console.error('[wrapped]',    e); }
    try { initVeiculos();      } catch (e) { console.error('[veiculos]',   e); }
    try { initPassagens();     } catch (e) { console.error('[passagens]',  e); }
    try { carregarDashboard(); } catch (e) { console.error('[dashboard]',  e); }
  });

})();