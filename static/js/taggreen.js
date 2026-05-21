/* TagGreen — Main JavaScript */

document.addEventListener('DOMContentLoaded', function () {
  var vehicleButtons = document.querySelectorAll('.tg-vehicle-btn');
  var contextButtons = document.querySelectorAll('.tg-context-btn');
  var vehicleInput   = document.getElementById('vehicle_type_input');
  var contextInput   = document.getElementById('context_type_input');

  vehicleButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      vehicleButtons.forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      if (vehicleInput) vehicleInput.value = btn.dataset.vehicle;
    });
  });

  contextButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      contextButtons.forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      if (contextInput) contextInput.value = btn.dataset.context;
    });
  });

  animateCounters();

  document.querySelectorAll('.alert').forEach(function (el) {
    setTimeout(function () {
      var bsAlert = bootstrap.Alert.getOrCreateInstance(el);
      if (bsAlert) bsAlert.close();
    }, 5000);
  });

  // AJAX real-time calc
  var passagesRange = document.getElementById('passagens_range');
  if (passagesRange) {
    var debounceTimer;
    passagesRange.addEventListener('input', function () {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(fetchCalcResult, 600);
    });
  }
});

function fetchCalcResult() {
  var vehicleEl  = document.getElementById('vehicle_type_input');
  var contextEl  = document.getElementById('context_type_input');
  var passageEl  = document.getElementById('passagens_range');
  if (!vehicleEl || !contextEl || !passageEl) return;

  fetch('/api/calcular/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
    body: JSON.stringify({
      vehicle_type: vehicleEl.value,
      context_type: contextEl.value,
      passagens: parseInt(passageEl.value)
    }),
  })
  .then(function (r) { return r.json(); })
  .then(function (data) { updateResultPanel(data); })
  .catch(function (err) { console.warn('Calc API error:', err); });
}

function updateResultPanel(data) {
  var panel = document.getElementById('resultPanel');
  if (!panel) {
    // Build result panel dynamically if not present
    var placeholder = document.querySelector('.tg-result-placeholder');
    if (placeholder) {
      placeholder.outerHTML = buildResultHTML(data);
    }
    return;
  }
  setEl(panel, '.tg-result-co2', data.co2_economizado_kg + ' kg');
  setEl(panel, '.tg-result-badge', '-' + data.reducao_pct + '% de emissao');
  var metrics = panel.querySelectorAll('.tg-metric-num');
  if (metrics.length >= 4) {
    metrics[0].textContent = data.arvores_equivalentes;
    metrics[1].textContent = data.combustivel_economizado + data.combustivel_unit;
    metrics[2].textContent = data.tempo_economizado_min + 'min';
    metrics[3].textContent = data.papel_evitado_folhas;
  }
}

function buildResultHTML(data) {
  return '<div class="tg-result-panel" id="resultPanel">'
    + '<div class="tg-result-hero text-center mb-4">'
    + '<div class="tg-result-co2">' + data.co2_economizado_kg + ' kg</div>'
    + '<div class="tg-result-label">de CO₂ evitados por mês</div>'
    + '<div class="tg-result-badge mt-2">-' + data.reducao_pct + '% de emissão</div>'
    + '</div>'
    + '<div class="row g-3">'
    + metricCard('🌳', data.arvores_equivalentes, 'árvores/mês')
    + metricCard('⛽', data.combustivel_economizado + data.combustivel_unit, 'combustível')
    + metricCard('⏱️', data.tempo_economizado_min + 'min', 'tempo livre')
    + metricCard('📄', data.papel_evitado_folhas, 'papéis evitados')
    + '</div></div>';
}

function metricCard(icon, val, label) {
  return '<div class="col-6"><div class="tg-metric-card">'
    + '<div class="tg-metric-icon">' + icon + '</div>'
    + '<div class="tg-metric-num">' + val + '</div>'
    + '<div class="tg-metric-label">' + label + '</div>'
    + '</div></div>';
}

function setEl(parent, selector, text) {
  var el = parent.querySelector(selector);
  if (el) el.textContent = text;
}

function animateCounters() {
  var counters = document.querySelectorAll('.tg-kpi-value');
  if (!('IntersectionObserver' in window)) return;
  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      var el = entry.target;
      var text = el.textContent.trim();
      var num = parseFloat(text.replace(/[^\d.]/g, ''));
      if (!isNaN(num) && num > 0) animateValue(el, 0, num, 1200, text);
      observer.unobserve(el);
    });
  }, { threshold: 0.5 });
  counters.forEach(function (el) { observer.observe(el); });
}

function animateValue(el, start, end, duration, originalText) {
  var suffix = originalText.replace(/^[#]?[\d.,]+/, '');
  var prefix = originalText.startsWith('#') ? '#' : '';
  var startTime = null;
  function step(ts) {
    if (!startTime) startTime = ts;
    var progress = Math.min((ts - startTime) / duration, 1);
    var val = start + (end - start) * (1 - Math.pow(1 - progress, 3));
    el.textContent = prefix + (Number.isInteger(end) ? Math.round(val) : val.toFixed(1)) + suffix;
    if (progress < 1) requestAnimationFrame(step);
    else el.textContent = originalText;
  }
  requestAnimationFrame(step);
}

function getCsrfToken() {
  var cookie = document.cookie.split(';').find(function (c) { return c.trim().startsWith('csrftoken='); });
  return cookie ? decodeURIComponent(cookie.split('=')[1]) : '';
}
