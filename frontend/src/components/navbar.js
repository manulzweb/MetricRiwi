import { isAuthenticated, getUser, clearSession } from '../services/api.js';
import { disconnectSocket } from '../services/socket.js';

export function renderNavbar() {
  const el = document.getElementById('navbar');

  if (!isAuthenticated()) {
    el.innerHTML = '';
    return;
  }

  const user = getUser();
  el.innerHTML = `
    <div class="navbar bg-base-100 shadow-md">
      <div class="container mx-auto max-w-5xl px-4">
        <div class="flex-1 items-center gap-2">
          <a href="#/dashboard" class="text-xl font-bold text-primary">📊 FeedbackAI</a>
        </div>
        <div class="flex-none gap-1">
          <a href="#/dashboard" class="btn btn-ghost btn-sm">Dashboard</a>
          <a href="#/historial" class="btn btn-ghost btn-sm">Historial</a>
          <div class="dropdown dropdown-end">
            <div tabindex="0" role="button" class="btn btn-ghost btn-sm normal-case">
              <span class="hidden sm:inline" id="navbar-email"></span> ▾
            </div>
            <ul tabindex="0" class="dropdown-content menu bg-base-100 rounded-box z-10 w-52 p-2 shadow">
              <li><button id="logout-btn">Cerrar sesión</button></li>
            </ul>
          </div>
        </div>
      </div>
    </div>`;

  el.querySelector('#navbar-email').textContent = user?.email || '';
  el.querySelector('#logout-btn').addEventListener('click', () => {
    clearSession();
    disconnectSocket();
    window.location.hash = '#/login';
  });
}
