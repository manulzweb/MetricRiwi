import { api, saveSession } from '../services/api.js';
import { showToast } from '../components/toast.js';

export function renderLogin(app) {
  app.innerHTML = `
    <div class="flex justify-center pt-12">
      <div class="card w-full max-w-md bg-base-100 shadow-xl">
        <div class="card-body">
          <h1 class="text-2xl font-bold text-center text-primary">📊 FeedbackAI</h1>
          <p class="text-center text-base-content/70 mb-4">Convierte el feedback de tus clientes en decisiones</p>
          <form id="login-form" class="space-y-4">
            <label class="form-control">
              <span class="label-text mb-1">Email</span>
              <input type="email" name="email" required class="input input-bordered" placeholder="tu@negocio.com" />
            </label>
            <label class="form-control">
              <span class="label-text mb-1">Contraseña</span>
              <input type="password" name="password" required class="input input-bordered" placeholder="••••••••" />
            </label>
            <button type="submit" class="btn btn-primary w-full">Iniciar sesión</button>
          </form>
          <p class="text-center text-sm mt-2">
            ¿No tienes cuenta? <a href="#/registro" class="link link-primary">Regístrate</a>
          </p>
        </div>
      </div>
    </div>`;

  app.querySelector('#login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    btn.classList.add('btn-disabled');
    try {
      const data = new FormData(e.target);
      const session = await api.login(data.get('email'), data.get('password'));
      saveSession(session);
      window.location.hash = '#/dashboard';
    } catch (err) {
      showToast(err.message, 'error');
      btn.classList.remove('btn-disabled');
    }
  });
}
