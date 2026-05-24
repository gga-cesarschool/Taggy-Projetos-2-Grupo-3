// =============================================
// TagGreen — FAQ
// Acordeão · busca em tempo real · filtro por categoria
// =============================================

(function () {
  'use strict';

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

    // ── Referências ─────────────────────────────────────────────────────
    const searchInput  = document.getElementById('faq-search');
    const countEl      = document.getElementById('faq-count');
    const emptyEl      = document.getElementById('faq-empty');
    const emptyTermEl  = document.getElementById('faq-empty-term');
    const emptyReset   = document.getElementById('faq-empty-reset');
    const filterBtns   = document.querySelectorAll('.faq-filter');
    const items        = document.querySelectorAll('.faq-item');

    let catAtiva  = 'todos';
    let termoBusca = '';

    // ── ACORDEÃO ────────────────────────────────────────────────────────

    items.forEach(item => {
      const btn    = item.querySelector('.faq-item__btn');
      const answer = item.querySelector('.faq-item__answer');
      const icon   = item.querySelector('.faq-item__icon');

      if (!btn || !answer) return;

      btn.addEventListener('click', () => {
        const isOpen = item.classList.contains('faq-item--open');

        // Fecha todos os outros
        items.forEach(other => {
          if (other === item) return;
          other.classList.remove('faq-item--open');
          const otherAnswer = other.querySelector('.faq-item__answer');
          const otherBtn    = other.querySelector('.faq-item__btn');
          const otherIcon   = other.querySelector('.faq-item__icon');
          if (otherAnswer) otherAnswer.hidden = true;
          if (otherBtn)    otherBtn.setAttribute('aria-expanded', 'false');
          if (otherIcon)   otherIcon.textContent = 'expand_more';
        });

        // Alterna o atual
        if (isOpen) {
          item.classList.remove('faq-item--open');
          answer.hidden = true;
          btn.setAttribute('aria-expanded', 'false');
          if (icon) icon.textContent = 'expand_more';
        } else {
          item.classList.add('faq-item--open');
          answer.hidden = false;
          btn.setAttribute('aria-expanded', 'true');
          if (icon) icon.textContent = 'expand_less';
        }
      });
    });

    // ── FILTRO + BUSCA (função unificada) ───────────────────────────────

    function normalizar(str) {
      return str
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');  // remove acentos para comparação
    }

    function aplicarFiltros() {
      const termo    = normalizar(termoBusca.trim());
      let visiveis   = 0;

      items.forEach(item => {
        const cat      = item.dataset.cat || '';
        const btnText  = item.querySelector('.faq-item__btn span')?.textContent || '';
        const ansText  = item.querySelector('.faq-item__answer')?.textContent || '';
        const texto    = normalizar(btnText + ' ' + ansText);

        const passaCat  = catAtiva === 'todos' || cat === catAtiva;
        const passaBusca = !termo || texto.includes(termo);
        const visivel   = passaCat && passaBusca;

        item.classList.toggle('faq-item--hidden', !visivel);
        if (visivel) visiveis++;
      });

      // Atualiza contador
      if (countEl) {
        if (termo || catAtiva !== 'todos') {
          countEl.textContent = `${visiveis} pergunta${visiveis !== 1 ? 's' : ''} encontrada${visiveis !== 1 ? 's' : ''}`;
        } else {
          countEl.textContent = '';
        }
      }

      // Mensagem de vazio
      if (emptyEl) {
        emptyEl.hidden = visiveis > 0;
        if (emptyTermEl) emptyTermEl.textContent = termoBusca.trim();
      }
    }

    // ── FILTROS DE CATEGORIA ────────────────────────────────────────────

    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        filterBtns.forEach(b => {
          b.classList.remove('faq-filter--active');
          b.setAttribute('aria-selected', 'false');
        });
        btn.classList.add('faq-filter--active');
        btn.setAttribute('aria-selected', 'true');

        catAtiva = btn.dataset.cat || 'todos';

        // Limpa busca ao trocar categoria
        if (searchInput) {
          searchInput.value = '';
          termoBusca = '';
        }

        // Fecha todos os itens abertos
        items.forEach(item => {
          item.classList.remove('faq-item--open');
          const ans  = item.querySelector('.faq-item__answer');
          const ibtn = item.querySelector('.faq-item__btn');
          const ico  = item.querySelector('.faq-item__icon');
          if (ans)  ans.hidden = true;
          if (ibtn) ibtn.setAttribute('aria-expanded', 'false');
          if (ico)  ico.textContent = 'expand_more';
        });

        aplicarFiltros();
      });
    });

    // ── BUSCA EM TEMPO REAL ─────────────────────────────────────────────

    if (searchInput) {
      let debounceTimer;

      searchInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          termoBusca = searchInput.value;

          // Ao buscar, volta para categoria "Todos"
          if (termoBusca.trim() && catAtiva !== 'todos') {
            filterBtns.forEach(b => {
              b.classList.toggle('faq-filter--active', b.dataset.cat === 'todos');
              b.setAttribute('aria-selected', b.dataset.cat === 'todos' ? 'true' : 'false');
            });
            catAtiva = 'todos';
          }

          aplicarFiltros();
        }, 200);
      });

      // Limpa busca com tecla Escape
      searchInput.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
          searchInput.value = '';
          termoBusca = '';
          aplicarFiltros();
        }
      });
    }

    // ── BOTÃO LIMPAR BUSCA (no estado vazio) ────────────────────────────

    if (emptyReset) {
      emptyReset.addEventListener('click', () => {
        if (searchInput) searchInput.value = '';
        termoBusca = '';
        catAtiva   = 'todos';

        filterBtns.forEach(b => {
          b.classList.toggle('faq-filter--active', b.dataset.cat === 'todos');
          b.setAttribute('aria-selected', b.dataset.cat === 'todos' ? 'true' : 'false');
        });

        aplicarFiltros();
        if (searchInput) searchInput.focus();
      });
    }

    // ── INIT ────────────────────────────────────────────────────────────
    aplicarFiltros();

  });

})();