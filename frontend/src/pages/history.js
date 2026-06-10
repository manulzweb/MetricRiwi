import { api } from '../services/api.js';
import { showToast } from '../components/toast.js';

const STATUS_BADGES = {
  pending: ['Pendiente', 'badge-warning'],
  processing: ['Procesando', 'badge-info'],
  completed: ['Completado', 'badge-success'],
  failed: ['Fallido', 'badge-error'],
};

function formatDate(iso) {
  return new Date(iso).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
}

export async function renderHistory(app) {
  app.innerHTML = `
    <h1 class="text-3xl font-bold mb-6">Historial de análisis</h1>
    <div class="flex justify-center py-8"><span class="loading loading-spinner loading-lg"></span></div>`;

  try {
    const { analyses } = await api.getHistory();

    if (analyses.length === 0) {
      app.innerHTML = `
        <h1 class="text-3xl font-bold mb-6">Historial de análisis</h1>
        <div class="card bg-base-100 shadow-xl">
          <div class="card-body items-center text-center">
            <p class="text-5xl mb-2">📭</p>
            <p>Aún no tienes análisis.</p>
            <a href="#/dashboard" class="btn btn-primary mt-2">Subir mi primer feedback</a>
          </div>
        </div>`;
      return;
    }

    const rows = analyses.map((a) => {
      const [label, badge] = STATUS_BADGES[a.status] || [a.status, 'badge-ghost'];
      const score = a.sentiment_score != null ? `${Math.round(a.sentiment_score)}%` : '—';
      return `
        <tr class="hover">
          <td class="font-medium"></td>
          <td>${formatDate(a.created_at)}</td>
          <td>${a.feedback_count}</td>
          <td><span class="badge ${badge}">${label}</span></td>
          <td>${score}</td>
          <td>${a.status === 'completed' ? `<a href="#/reporte/${a.id}" class="btn btn-sm btn-outline btn-primary">Ver reporte</a>` : ''}</td>
        </tr>`;
    }).join('');

    app.innerHTML = `
      <h1 class="text-3xl font-bold mb-6">Historial de análisis</h1>
      <div class="card bg-base-100 shadow-xl overflow-x-auto">
        <table class="table">
          <thead>
            <tr><th>Título</th><th>Fecha</th><th>Comentarios</th><th>Estado</th><th>Sentimiento</th><th></th></tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;

    // Insertar títulos como texto plano (evita inyección HTML)
    app.querySelectorAll('tbody tr').forEach((tr, i) => {
      tr.querySelector('td').textContent = analyses[i].title;
    });
  } catch (err) {
    showToast(err.message, 'error');
  }
}
