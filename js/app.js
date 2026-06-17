const VIEWS = ['home', 'calendar', 'stats', 'categories', 'settings'];

function renderView(viewName) {
  switch (viewName) {
    case 'home': renderHome(); break;
    case 'calendar': renderCalendar(); break;
    case 'stats': renderStats(); break;
    case 'categories': renderCategories(); break;
    case 'settings': renderSettings(); break;
  }
}

function showView(viewName) {
  for (const v of VIEWS) {
    document.getElementById(`view-${v}`).hidden = (v !== viewName);
  }
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.view === viewName);
  });
  renderView(viewName);
}

document.querySelectorAll('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => showView(btn.dataset.view));
});

initializeData().then(() => {
  initializeNotifications();
  showView('home');
});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('service-worker.js').catch(() => {});
}
