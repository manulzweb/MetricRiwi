import { isAuthenticated } from './services/api.js';
import { renderNavbar } from './components/navbar.js';
import { renderLogin } from './pages/login.js';
import { renderRegister } from './pages/register.js';
import { renderDashboard } from './pages/dashboard.js';
import { renderHistory } from './pages/history.js';
import { renderReport } from './pages/report.js';

const routes = [
  { pattern: /^#\/login$/, render: renderLogin, public: true },
  { pattern: /^#\/registro$/, render: renderRegister, public: true },
  { pattern: /^#\/dashboard$/, render: renderDashboard },
  { pattern: /^#\/historial$/, render: renderHistory },
  { pattern: /^#\/reporte\/([0-9a-f-]+)$/, render: (app, m) => renderReport(app, { id: m[1] }) },
];

function resolve() {
  const hash = window.location.hash || '#/dashboard';
  const app = document.getElementById('app');

  for (const route of routes) {
    const match = hash.match(route.pattern);
    if (!match) continue;

    if (!route.public && !isAuthenticated()) {
      window.location.hash = '#/login';
      return;
    }
    if (route.public && isAuthenticated()) {
      window.location.hash = '#/dashboard';
      return;
    }

    renderNavbar();
    route.render(app, match);
    return;
  }

  window.location.hash = isAuthenticated() ? '#/dashboard' : '#/login';
}

export function startRouter() {
  window.addEventListener('hashchange', resolve);
  resolve();
}
