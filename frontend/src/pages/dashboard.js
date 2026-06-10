import { api, getUser } from '../services/api.js';
import { watchAnalysis } from '../services/socket.js';
import { showToast } from '../components/toast.js';

let unwatch = null;

export function renderDashboard(app) {
  if (unwatch) { unwatch(); unwatch = null; }
  const user = getUser();

  app.innerHTML = `
    <h1 class="text-3xl font-bold mb-1">¡Hola de nuevo!</h1>
    <p class="text-base-content/70 mb-6">${user?.email || ''}</p>

    <div class="card bg-base-100 shadow-xl">
      <div class="card-body">
        <h2 class="card-title">Subir nuevo feedback</h2>

        <div role="tablist" class="tabs tabs-boxed w-fit mb-2">
          <a role="tab" class="tab tab-active" data-tab="csv">Archivo CSV</a>
          <a role="tab" class="tab" data-tab="text">Pegar texto</a>
        </div>

        <form id="upload-form" class="space-y-4">
          <label class="form-control">
            <span class="label-text mb-1">Título del análisis (opcional)</span>
            <input type="text" name="title" class="input input-bordered" placeholder="Ej: Reseñas de octubre" maxlength="255" />
          </label>

          <div data-panel="csv">
            <input type="file" name="file" accept=".csv,text/csv" class="file-input file-input-bordered w-full" />
            <p class="text-xs text-base-content/60 mt-1">CSV con una columna de comentarios (máx. 2MB)</p>
          </div>

          <div data-panel="text" class="hidden">
            <textarea name="text" rows="6" class="textarea textarea-bordered w-full"
              placeholder="Pega aquí los comentarios, uno por línea..."></textarea>
          </div>

          <button type="submit" class="btn btn-primary">Analizar ahora ✨</button>
        </form>
      </div>
    </div>

    <div id="progress-card" class="card bg-base-100 shadow-xl mt-6 hidden">
      <div class="card-body">
        <h2 class="card-title">Analizando con IA <span class="loading loading-dots loading-sm"></span></h2>
        <progress id="progress-bar" class="progress progress-primary w-full" value="0" max="100"></progress>
        <p id="progress-text" class="text-sm text-base-content/70">Preparando análisis...</p>
      </div>
    </div>`;

  // Tabs CSV / texto
  let activeTab = 'csv';
  app.querySelectorAll('[role=tab]').forEach((tab) => {
    tab.addEventListener('click', () => {
      activeTab = tab.dataset.tab;
      app.querySelectorAll('[role=tab]').forEach((t) => t.classList.toggle('tab-active', t === tab));
      app.querySelectorAll('[data-panel]').forEach((p) =>
        p.classList.toggle('hidden', p.dataset.panel !== activeTab)
      );
    });
  });

  app.querySelector('#upload-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const btn = form.querySelector('button[type=submit]');
    const fields = form.elements;
    const title = fields.namedItem('title').value;

    try {
      btn.classList.add('btn-disabled');
      let result;
      if (activeTab === 'csv') {
        const file = fields.namedItem('file').files[0];
        if (!file) throw new Error('Selecciona un archivo CSV');
        const fd = new FormData();
        fd.append('file', file);
        if (title) fd.append('title', title);
        result = await api.uploadAnalysis(fd);
      } else {
        const text = fields.namedItem('text').value;
        if (!text.trim()) throw new Error('Pega al menos un comentario');
        result = await api.uploadText(title, text);
      }
      showToast(`Análisis encolado: ${result.totalComments} comentarios`, 'success');
      trackProgress(app, result.analysisId);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      btn.classList.remove('btn-disabled');
    }
  });
}

function trackProgress(app, analysisId) {
  const card = app.querySelector('#progress-card');
  const bar = app.querySelector('#progress-bar');
  const text = app.querySelector('#progress-text');
  card.classList.remove('hidden');
  card.scrollIntoView({ behavior: 'smooth' });

  const goToReport = () => {
    if (unwatch) { unwatch(); unwatch = null; }
    window.location.hash = `#/reporte/${analysisId}`;
  };

  unwatch = watchAnalysis(analysisId, {
    onJoin: (ack) => {
      // Si el worker terminó antes de unirnos a la sala, ir directo al reporte.
      if (ack?.ok && (ack.status === 'completed' || ack.status === 'failed')) goToReport();
      if (ack && !ack.ok) showToast(ack.error || 'No se pudo seguir el progreso', 'error');
    },
    onProgress: (p) => {
      bar.value = p.percent;
      text.textContent = p.statusText;
    },
    onComplete: goToReport,
    onFailed: (p) => {
      if (unwatch) { unwatch(); unwatch = null; }
      card.classList.add('hidden');
      showToast(p.message || 'El análisis falló', 'error');
    },
  });
}
