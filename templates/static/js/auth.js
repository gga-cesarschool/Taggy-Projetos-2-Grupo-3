// =============================================
// TagGreen — Auth JS
// toggle senha · força da senha · tabs de tipo · máscara CNPJ
// =============================================

(function () {
  'use strict';

  // ── Toggle de visibilidade de senha ─────────────────────────────────────
  function setupPasswordToggle(btnId, inputId, iconId) {
    const btn   = document.getElementById(btnId);
    const input = document.getElementById(inputId);
    const icon  = document.getElementById(iconId);
    if (!btn || !input || !icon) return;

    btn.addEventListener('click', () => {
      const hide = input.type === 'password';
      input.type       = hide ? 'text' : 'password';
      icon.textContent = hide ? 'visibility_off' : 'visibility';
      btn.setAttribute('aria-label', hide ? 'Ocultar senha' : 'Mostrar senha');
    });
  }

  // ── Força da senha ───────────────────────────────────────────────────────
  const LEVELS = [
    null,
    { bars: 1, label: 'Muito fraca', cls: 'fraca' },
    { bars: 1, label: 'Fraca',       cls: 'fraca' },
    { bars: 2, label: 'Média',       cls: 'media' },
    { bars: 2, label: 'Média',       cls: 'media' },
    { bars: 3, label: 'Boa',         cls: 'boa'   },
    { bars: 3, label: 'Boa',         cls: 'boa'   },
    { bars: 4, label: 'Forte',       cls: 'forte' },
  ];

  function calcScore(pwd) {
    if (!pwd) return 0;
    let s = 0;
    if (pwd.length >= 8)            s++;
    if (pwd.length >= 12)           s++;
    if (/[A-Z]/.test(pwd))          s++;
    if (/[a-z]/.test(pwd))          s++;
    if (/[0-9]/.test(pwd))          s++;
    if (/[^A-Za-z0-9]/.test(pwd))   s += 2;
    return Math.min(s, 7);
  }

  function setupStrengthMeter() {
    const input = document.getElementById('password');
    const wrap  = document.getElementById('pwd-strength');
    const label = document.getElementById('pwd-label');
    const bars  = [1, 2, 3, 4].map(i => document.getElementById(`pwd-bar-${i}`));
    if (!input || !wrap) return;

    input.addEventListener('input', () => {
      const pwd   = input.value;
      const score = calcScore(pwd);

      if (!pwd) { wrap.hidden = true; return; }
      wrap.hidden = false;

      const lvl = LEVELS[score] || LEVELS[1];
      bars.forEach((bar, i) => {
        bar.className = 'password-strength__bar';
        if (i < lvl.bars) bar.classList.add(`password-strength__bar--${lvl.cls}`);
      });
      if (label) {
        label.textContent = lvl.label;
        label.className   = `password-strength__label password-strength__label--${lvl.cls}`;
      }
    });
  }

  // ── Validação inline de confirmação ─────────────────────────────────────
  function setupConfirmCheck() {
    const pwd     = document.getElementById('password');
    const confirm = document.getElementById('confirm_password');
    if (!pwd || !confirm) return;

    const validate = () => {
      if (!confirm.value) return;
      confirm.classList.toggle('form-input--error', pwd.value !== confirm.value);
    };
    confirm.addEventListener('input', validate);
    pwd.addEventListener('input', validate);
  }

  // ── Máscara de CNPJ: 00.000.000/0001-00 ─────────────────────────────────
  function setupCnpjMask() {
    const input = document.getElementById('cnpj');
    if (!input) return;

    input.addEventListener('input', () => {
      let v = input.value.replace(/\D/g, '').slice(0, 14);
      if (v.length > 12) {
        v = v.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2}).*/, '$1.$2.$3/$4-$5');
      } else if (v.length > 8) {
        v = v.replace(/^(\d{2})(\d{3})(\d{3})(\d{0,4}).*/, '$1.$2.$3/$4');
      } else if (v.length > 5) {
        v = v.replace(/^(\d{2})(\d{3})(\d{0,3}).*/, '$1.$2.$3');
      } else if (v.length > 2) {
        v = v.replace(/^(\d{2})(\d{0,3}).*/, '$1.$2');
      }
      input.value = v;
    });
  }

  // ── Tabs de tipo (Pessoa / Empresa) ────────────────────────────────────
  function setupTypeTabs() {
    const tabs        = document.querySelectorAll('.auth-type-tab');
    const tipoInput   = document.getElementById('tipo-input');
    const fieldsPessoa = document.getElementById('fields-pessoa');
    const fieldsEmpresa = document.getElementById('fields-empresa');
    const submitIcon  = document.getElementById('submit-icon');
    const submitLabel = document.getElementById('submit-label');

    if (!tabs.length || !tipoInput) return;

    // Campos obrigatórios por tipo
    const camposPessoa  = document.getElementById('nome');
    const camposEmpresa = [
      document.getElementById('nome_empresa'),
      document.getElementById('cnpj'),
    ];

    function ativarTipo(tipo) {
      tipoInput.value = tipo;

      tabs.forEach(t => {
        const ativo = t.dataset.tipo === tipo;
        t.classList.toggle('auth-type-tab--active', ativo);
        t.setAttribute('aria-selected', String(ativo));
      });

      const isPessoa = tipo === 'pessoa';

      // Mostra/oculta painéis
      if (fieldsPessoa)  fieldsPessoa.hidden  = !isPessoa;
      if (fieldsEmpresa) fieldsEmpresa.hidden  = isPessoa;

      // Remove required dos campos ocultos para não bloquear o envio
      if (camposPessoa) camposPessoa.required  = isPessoa;
      camposEmpresa.forEach(el => { if (el) el.required = !isPessoa; });

      // Atualiza botão
      if (submitIcon)  submitIcon.textContent  = isPessoa ? 'eco' : 'insert_chart';
      if (submitLabel) submitLabel.textContent = isPessoa
        ? 'Criar conta grátis'
        : 'Criar conta empresarial';
    }

    tabs.forEach(tab => {
      tab.addEventListener('click', () => ativarTipo(tab.dataset.tipo));
    });

    // Inicializa com o tipo que veio do servidor (re-submit com erro)
    ativarTipo(tipoInput.value || 'pessoa');
  }

  // ── Init ────────────────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    setupPasswordToggle('toggle-pwd',     'password',         'toggle-pwd-icon');
    setupPasswordToggle('toggle-confirm', 'confirm_password', 'toggle-confirm-icon');
    setupStrengthMeter();
    setupConfirmCheck();
    setupCnpjMask();
    setupTypeTabs();
  });

})();