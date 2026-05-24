// =============================================
// TagGreen — Metodologia
// =============================================

(function () {
  // Constantes do cálculo (espelham views.py / GHG Protocol BR 2023)
  const IDLE_RATE = 0.65;    // L/h — consumo carro flex em marcha lenta (CONPET 2022)
  const EF_FLEX   = 1.335;   // kg CO₂e/L — mix flex (ANFAVEA 2023 + GHG Protocol BR 2023)
  const CNT_REF   = 3.0;     // min — tempo médio de fila CNT 2022

  /**
   * E_idle = (tempo_min / 60) × consumo_idle × fator_emissao
   * Retorna valor em GRAMAS (× 1000).
   */
  function calcIdle(tempoMin) {
    return (tempoMin / 60) * IDLE_RATE * EF_FLEX * 1000;
  }

  document.addEventListener('DOMContentLoaded', () => {

    // ── Hamburger menu ──────────────────────────────────────────────────
    const hamburgerBtn = document.getElementById('hamburger-btn');
    const mainNav      = document.getElementById('main-nav');
    if (hamburgerBtn && mainNav) {
      hamburgerBtn.addEventListener('click', () => {
        const isOpen = mainNav.classList.toggle('is-open');
        hamburgerBtn.classList.toggle('is-open', isOpen);
        hamburgerBtn.setAttribute('aria-expanded', String(isOpen));
      });
    }

    // ── Slider de sensibilidade ─────────────────────────────────────────
    const slider     = document.getElementById('sens-slider');
    const resultEl   = document.getElementById('sens-result');
    const labelEl    = document.getElementById('sens-label');
    const refEl      = document.getElementById('sens-ref');

    if (!slider || !resultEl || !labelEl) return;

    const refGramas = calcIdle(CNT_REF);   // valor de referência CNT

    function atualizar() {
      const t   = parseFloat(slider.value);
      const g   = calcIdle(t);

      // Atualiza label do slider
      labelEl.textContent = `Tempo de fila — ${t.toFixed(1).replace('.', ',')} min`;

      // Atualiza resultado
      resultEl.textContent = g.toFixed(1).replace('.', ',');

      // Atualiza texto de referência
      if (refEl) {
        refEl.textContent =
          `CNT 2022 médio real — ${CNT_REF.toFixed(1).replace('.', ',')} min → ${refGramas.toFixed(1).replace('.', ',')} g`;
      }

      // Atualiza a faixa colorida do slider (track)
      const pct = ((t - parseFloat(slider.min)) / (parseFloat(slider.max) - parseFloat(slider.min))) * 100;
      slider.style.background =
        `linear-gradient(to right, #2E7D32 0%, #2E7D32 ${pct}%, #E2E8F0 ${pct}%)`;
    }

    slider.addEventListener('input', atualizar);

    // Dispara uma vez para inicializar com o valor padrão (3,0 min)
    atualizar();

  });

})();