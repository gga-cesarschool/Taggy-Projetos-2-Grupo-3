(function () {

  // ===========================================
  // FAQ ACCORDION
  // ===========================================
  document.querySelectorAll('.faq-item').forEach(item => {
    const btn    = item.querySelector('.faq-item__btn');
    const answer = item.querySelector('.faq-item__answer');

    // Abre o item marcado como aberto no load
    if (item.classList.contains('faq-item--open')) {
      answer.style.maxHeight = answer.scrollHeight + 'px';
    }

    btn.addEventListener('click', () => {
      const isOpen = item.classList.contains('faq-item--open');

      // Fecha todos
      document.querySelectorAll('.faq-item').forEach(i => {
        i.classList.remove('faq-item--open');
        i.querySelector('.faq-item__answer').style.maxHeight = null;
        i.querySelector('.faq-item__btn').setAttribute('aria-expanded', 'false');
      });

      // Abre o clicado (se estava fechado)
      if (!isOpen) {
        item.classList.add('faq-item--open');
        answer.style.maxHeight = answer.scrollHeight + 'px';
        btn.setAttribute('aria-expanded', 'true');
      }
    });
  });

  // ===========================================
  // HAMBURGER
  // ===========================================
  const hamburger = document.getElementById('hamburger-btn');
  const nav       = document.getElementById('main-nav');
  if (hamburger && nav) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('is-open');
      nav.classList.toggle('is-open');
      hamburger.setAttribute('aria-expanded', nav.classList.contains('is-open'));
    });
  }

})();