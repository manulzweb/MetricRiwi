import { api, saveSession } from '../services/api.js';
import { showToast } from '../components/toast.js';

export function renderRegister(app) {
  app.innerHTML = `
    <div class="flex justify-center pt-12">
      <div class="card w-full max-w-md bg-base-100 shadow-xl">
        <div class="card-body">
          <h1 class="text-2xl font-bold text-center text-primary">Crea tu cuenta</h1>
          <p class="text-center text-base-content/70 mb-4">Empieza a entender a tus clientes en minutos</p>
          <form id="register-form" class="space-y-4">
            <label class="form-control">
              <span class="label-text mb-1">Email</span>
              <input type="email" name="email" required class="input input-bordered" placeholder="tu@negocio.com" />
            </label>
            <label class="form-control">
              <span class="label-text mb-1">Contraseña (mínimo 8 caracteres)</span>
              <input type="password" name="password" required minlength="8" class="input input-bordered" placeholder="••••••••" />
            </label>
            <button type="submit" class="btn btn-primary w-full">Registrarme</button>
          </form>
          <p class="text-center text-sm mt-2">
            ¿Ya tienes cuenta? <a href="#/login" class="link link-primary">Inicia sesión</a>
          </p>
        </div>
      </div>
    </div>`;

  app.querySelector('#register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    btn.classList.add('btn-disabled');
    try {
      const data = new FormData(e.target);
      const session = await api.register(data.get('email'), data.get('password'));
      saveSession(session);
      showToast('¡Cuenta creada con éxito!', 'success');
      window.location.hash = '#/dashboard';
    } catch (err) {
      showToast(err.message, 'error');
      btn.classList.remove('btn-disabled');
    }
  });
}
