import { api } from '../services/api.js';
import { showToast } from '../components/toast.js';

const SENTIMENT_BADGES = {
  positive: ['Positivo', 'badge-success'],
  negative: ['Negativo', 'badge-error'],
  neutral: ['Neutral', 'badge-ghost'],
};

function scoreColor(score) {
  if (score >= 70) return 'text-success';
  if (score >= 40) return 'text-warning';
  return 'text-error';
}

function scoreEmoji(score) {
  if (score >= 70) return '🟢';
  if (score >= 40) return '🟡';
  return '🔴';
}

function themeList(themes, emptyText) {
  if (!themes || themes.length === 0) {
    return `<p class="text-base-content/60">${emptyText}</p>`;
  }
  return `<ol class="space-y-2">${themes.map((t, i) => `
    <li class="flex items-center justify-between gap-2">
      <span><span class="font-bold mr-1">${i + 1}.</span><span data-theme-name></span></span>
      <span class="badge badge-neutral">${Number(t.mentions) || 0}</span>
    </li>`).join('')}</ol>`;
}

export async function renderReport(app, params) {
  app.innerHTML = `<div class="flex justify-center py-8"><span class="loading loading-spinner loading-lg"></span></div>`;

  let analysis;
  try {
    ({ analysis } = await api.getAnalysis(params.id));
  } catch (err) {
    showToast(err.message, 'error');
    window.location.hash = '#/historial';
    return;
  }

  if (analysis.status !== 'completed') {
    app.innerHTML = `
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body items-center text-center">
          <p class="text-5xl mb-2">${analysis.status === 'failed' ? '⚠️' : '⏳'}</p>
          <p>${analysis.status === 'failed'
            ? 'Este análisis falló. Intenta subir el feedback de nuevo.'
            : 'Este análisis todavía está en proceso. Vuelve en unos momentos.'}</p>
          <a href="#/historial" class="btn btn-primary mt-2">Volver al historial</a>
        </div>
      </div>`;
    return;
  }

  const score = Number(analysis.sentiment_score) || 0;
  const actions = analysis.recommended_actions || [];
  const feedbacks = analysis.feedbacks || [];

  app.innerHTML = `
    <div class="flex items-center justify-between flex-wrap gap-2 mb-6">
      <div>
        <h1 id="report-title" class="text-3xl font-bold"></h1>
        <p class="text-base-content/70">${feedbacks.length} comentarios analizados</p>
      </div>
      <a href="#/historial" class="btn btn-ghost btn-sm">← Historial</a>
    </div>

    <div class="grid md:grid-cols-3 gap-6 mb-6">
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body items-center text-center">
          <h2 class="card-title text-base">Sentimiento general</h2>
          <div class="radial-progress ${scoreColor(score)}" style="--value:${Math.round(score)}; --size:8rem; --thickness:0.8rem;" role="progressbar">
            <span class="text-2xl font-bold">${Math.round(score)}%</span>
          </div>
          <p>${scoreEmoji(score)} ${score >= 70 ? 'Tus clientes están contentos' : score >= 40 ? 'Hay aspectos por mejorar' : 'Atención: muchos clientes insatisfechos'}</p>
        </div>
      </div>

      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title text-base">🔥 Principales quejas</h2>
          <div id="negative-themes">${themeList(analysis.negative_themes, 'Sin quejas relevantes 🎉')}</div>
        </div>
      </div>

      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title text-base">🌟 Principales elogios</h2>
          <div id="positive-themes">${themeList(analysis.positive_themes, 'Sin elogios detectados')}</div>
        </div>
      </div>
    </div>

    <div class="card bg-base-100 shadow-xl mb-6">
      <div class="card-body">
        <h2 class="card-title">🛠 Acciones recomendadas</h2>
        <ul id="actions-list" class="space-y-2 mt-2">
          ${actions.map(() => `<li class="flex gap-2"><span class="text-primary">✔</span><span data-action></span></li>`).join('')}
        </ul>
      </div>
    </div>

    <div class="collapse collapse-arrow bg-base-100 shadow-xl">
      <input type="checkbox" />
      <div class="collapse-title font-medium">Ver comentarios individuales (${feedbacks.length})</div>
      <div class="collapse-content overflow-x-auto">
        <table class="table table-sm">
          <thead><tr><th>Comentario</th><th>Sentimiento</th></tr></thead>
          <tbody id="feedback-rows">
            ${feedbacks.map((f) => {
              const [label, badge] = SENTIMENT_BADGES[f.sentiment] || ['—', 'badge-ghost'];
              return `<tr><td data-content></td><td><span class="badge ${badge} badge-sm">${label}</span></td></tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>`;

  // Texto dinámico como textContent para evitar inyección HTML.
  app.querySelector('#report-title').textContent = analysis.title;
  app.querySelectorAll('#negative-themes [data-theme-name]').forEach((el, i) => {
    el.textContent = analysis.negative_themes[i].theme;
  });
  app.querySelectorAll('#positive-themes [data-theme-name]').forEach((el, i) => {
    el.textContent = analysis.positive_themes[i].theme;
  });
  app.querySelectorAll('#actions-list [data-action]').forEach((el, i) => {
    el.textContent = actions[i];
  });
  app.querySelectorAll('#feedback-rows [data-content]').forEach((el, i) => {
    el.textContent = feedbacks[i].content;
  });
}
