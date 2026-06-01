// ========================
// HAMBURGER MENU
// ========================
const hamburger = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobileMenu');

hamburger.addEventListener('click', () => {
  mobileMenu.classList.toggle('open');
  const spans = hamburger.querySelectorAll('span');
  if (mobileMenu.classList.contains('open')) {
    spans[0].style.transform = 'translateY(7px) rotate(45deg)';
    spans[1].style.opacity = '0';
    spans[2].style.transform = 'translateY(-7px) rotate(-45deg)';
  } else {
    spans[0].style.transform = '';
    spans[1].style.opacity = '';
    spans[2].style.transform = '';
  }
});

// ========================
// FILTER BUTTONS
// ========================
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const group = btn.dataset.group;
    if (group) {
      document.querySelectorAll(`.filter-btn[data-group="${group}"]`).forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    } else {
      // toggle for non-grouped
      btn.classList.toggle('active');
    }

    // If vehicle filter, filter activities
    if (group === 'vehicle') {
      filterActivities();
    }
  });
});

// ========================
// ACTIVITY FILTER
// ========================
function filterActivities() {
  const activeVehicle = document.querySelector('.vehicle-btn.active');
  const label = activeVehicle ? activeVehicle.textContent.trim().toLowerCase() : 'todos';
  const items = document.querySelectorAll('.activity-item');

  items.forEach(item => {
    if (label === 'todos') {
      item.style.display = '';
    } else {
      const vehicleMap = {
        'moto': 'moto',
        'caminhão': 'truck',
        'carro elétrico': 'electric',
      };
      const target = vehicleMap[label];
      if (target && item.dataset.vehicle === target) {
        item.style.display = '';
      } else if (target) {
        item.style.display = 'none';
      } else {
        item.style.display = '';
      }
    }
  });

  // Update count
  const visible = document.querySelectorAll('.activity-item:not([style*="none"])').length;
  const countEl = document.querySelector('.activity-count');
  if (countEl) countEl.textContent = `${visible} registro${visible !== 1 ? 's' : ''}`;
}

// ========================
// SEARCH
// ========================
const searchInput = document.querySelector('.search-input');
if (searchInput) {
  searchInput.addEventListener('input', () => {
    const query = searchInput.value.toLowerCase().trim();
    const items = document.querySelectorAll('.activity-item');

    items.forEach(item => {
      const text = item.textContent.toLowerCase();
      item.style.display = (!query || text.includes(query)) ? '' : 'none';
    });

    const visible = document.querySelectorAll('.activity-item:not([style*="none"])').length;
    const countEl = document.querySelector('.activity-count');
    if (countEl) countEl.textContent = `${visible} registro${visible !== 1 ? 's' : ''}`;
  });
}

// ========================
// PROGRESS BAR ANIMATION
// ========================
window.addEventListener('load', () => {
  const bar = document.querySelector('.progress-bar-fill');
  if (bar) {
    const target = bar.style.width;
    bar.style.width = '0%';
    setTimeout(() => {
      bar.style.width = target;
    }, 400);
  }
});

// ========================
// ACTIVITY ITEM CLICK (expand detail)
// ========================
document.querySelectorAll('.activity-item').forEach(item => {
  item.addEventListener('click', () => {
    item.classList.toggle('expanded');
  });
});
