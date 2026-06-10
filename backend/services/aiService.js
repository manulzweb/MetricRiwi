const Anthropic = require('@anthropic-ai/sdk');
const env = require('../config/env');

const SENTIMENTS = ['positive', 'negative', 'neutral'];

// ---------------------------------------------------------------------------
// Analizador real (Claude API)
// ---------------------------------------------------------------------------

let anthropicClient = null;
function getClient() {
  if (!anthropicClient) {
    anthropicClient = new Anthropic({ apiKey: env.anthropicApiKey, maxRetries: 4 });
  }
  return anthropicClient;
}

function extractJson(response) {
  const block = response.content.find((b) => b.type === 'text');
  if (!block) {
    throw new Error('La respuesta del modelo no contiene texto');
  }
  return JSON.parse(block.text);
}

const CLASSIFY_SCHEMA = {
  type: 'object',
  properties: {
    results: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          index: { type: 'integer' },
          sentiment: { type: 'string', enum: SENTIMENTS },
          theme: { type: 'string' },
        },
        required: ['index', 'sentiment', 'theme'],
        additionalProperties: false,
      },
    },
  },
  required: ['results'],
  additionalProperties: false,
};

async function classifyChunkWithClaude(comments) {
  const numbered = comments.map((c, i) => `${i}. ${c}`).join('\n');
  const response = await getClient().messages.create({
    model: env.anthropicModel,
    max_tokens: 8000,
    system:
      'Eres un analista de experiencia de cliente para restaurantes. ' +
      'Clasificas comentarios de clientes y extraes el tema principal de cada uno. ' +
      'Los temas deben ser cortos (2-4 palabras), en español y reutilizables entre comentarios similares ' +
      '(ej: "Demoras en la entrega", "Comida fría", "Buen sabor", "Atención amable", "Precio justo").',
    messages: [
      {
        role: 'user',
        content:
          'Clasifica el sentimiento (positive, negative o neutral) y el tema principal de cada comentario. ' +
          'Devuelve un resultado por cada índice.\n\nComentarios:\n' + numbered,
      },
    ],
    output_config: { format: { type: 'json_schema', schema: CLASSIFY_SCHEMA } },
  });

  const { results } = extractJson(response);
  // Alinear por índice; si el modelo omite alguno, se marca neutral.
  return comments.map((_, i) => {
    const r = results.find((x) => x.index === i);
    return {
      sentiment: r && SENTIMENTS.includes(r.sentiment) ? r.sentiment : 'neutral',
      theme: (r && r.theme) || 'General',
    };
  });
}

const SUMMARY_SCHEMA = {
  type: 'object',
  properties: {
    positive_themes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          theme: { type: 'string' },
          mentions: { type: 'integer' },
        },
        required: ['theme', 'mentions'],
        additionalProperties: false,
      },
    },
    negative_themes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          theme: { type: 'string' },
          mentions: { type: 'integer' },
        },
        required: ['theme', 'mentions'],
        additionalProperties: false,
      },
    },
    recommended_actions: {
      type: 'array',
      items: { type: 'string' },
    },
  },
  required: ['positive_themes', 'negative_themes', 'recommended_actions'],
  additionalProperties: false,
};

async function summarizeWithClaude({ positiveCounts, negativeCounts, sampleComments }) {
  const response = await getClient().messages.create({
    model: env.anthropicModel,
    max_tokens: 4000,
    thinking: { type: 'adaptive' },
    system:
      'Eres un consultor de negocios para restaurantes. A partir de temas detectados en comentarios de clientes, ' +
      'consolidas los temas duplicados o muy similares (sumando sus menciones) y propones acciones concretas. ' +
      'Responde siempre en español.',
    messages: [
      {
        role: 'user',
        content:
          'Temas positivos detectados (tema: menciones):\n' + JSON.stringify(positiveCounts) +
          '\n\nTemas negativos detectados (tema: menciones):\n' + JSON.stringify(negativeCounts) +
          '\n\nMuestra de comentarios:\n' + sampleComments.slice(0, 30).join('\n') +
          '\n\nConsolida y devuelve: los 5 principales temas positivos, los 5 principales temas negativos ' +
          '(ordenados por menciones, de mayor a menor) y de 3 a 5 acciones recomendadas, concretas y accionables ' +
          'para el dueño del negocio, priorizando los problemas más mencionados.',
      },
    ],
    output_config: { format: { type: 'json_schema', schema: SUMMARY_SCHEMA } },
  });

  const data = extractJson(response);
  return {
    positiveThemes: data.positive_themes,
    negativeThemes: data.negative_themes,
    recommendedActions: data.recommended_actions,
  };
}

// ---------------------------------------------------------------------------
// Analizador mock (sin API key): heurísticas por palabras clave en español
// ---------------------------------------------------------------------------

const MOCK_CATEGORIES = [
  { theme: 'Demoras en la entrega', sentiment: 'negative', keywords: ['lento', 'lenta', 'tarde', 'demora', 'esperando', 'espera', 'nunca llegó', 'horas'] },
  { theme: 'Comida fría', sentiment: 'negative', keywords: ['fría', 'frías', 'frío', 'fríos', 'aguadas'] },
  { theme: 'Mal servicio al cliente', sentiment: 'negative', keywords: ['grosero', 'grosera', 'pésimo servicio', 'mala atención', 'mal servicio'] },
  { theme: 'Errores en el pedido', sentiment: 'negative', keywords: ['incompleto', 'faltó', 'equivocado', 'error en el pedido'] },
  { theme: 'Problemas con la app', sentiment: 'negative', keywords: ['app', 'aplicación', 'no pude pagar', 'falla'] },
  { theme: 'Falta de limpieza', sentiment: 'negative', keywords: ['sucio', 'sucia', 'pegajosas', 'cochino'] },
  { theme: 'Ambiente ruidoso', sentiment: 'negative', keywords: ['ruido', 'música muy fuerte', 'muy fuerte'] },
  { theme: 'Buen sabor', sentiment: 'positive', keywords: ['delicioso', 'deliciosa', 'rico', 'rica', 'sabor', 'increíble', 'espectacular', 'me encantó', 'mejor'] },
  { theme: 'Atención amable', sentiment: 'positive', keywords: ['amable', 'amables', 'excelente atención', 'buen servicio', 'servicio rápido'] },
  { theme: 'Precio justo', sentiment: 'positive', keywords: ['precio justo', 'precios', 'económico', 'barato', 'calidad precio'] },
  { theme: 'Porciones generosas', sentiment: 'positive', keywords: ['porciones', 'generosas', 'abundante'] },
];

const MOCK_NEGATIVE_HINTS = ['malo', 'mala', 'pésimo', 'pésima', 'terrible', 'horrible', 'decepcion', 'nunca', 'no recomiendo'];
const MOCK_POSITIVE_HINTS = ['excelente', 'bueno', 'buena', 'genial', 'recomendado', 'recomiendo', 'perfecto', 'volveré', 'volvería'];

const MOCK_ACTIONS = {
  'Demoras en la entrega': 'Auditar los tiempos de despacho y los repartidores externos para reducir las demoras.',
  'Comida fría': 'Usar empaques térmicos para que los platos lleguen calientes a domicilio.',
  'Mal servicio al cliente': 'Capacitar al personal en atención al cliente y manejo de reclamos.',
  'Errores en el pedido': 'Implementar una doble verificación de pedidos antes del despacho.',
  'Problemas con la app': 'Revisar los fallos de la app de pedidos, en especial el flujo de pago.',
  'Falta de limpieza': 'Reforzar las rutinas de limpieza de mesas y áreas comunes durante el servicio.',
  'Ambiente ruidoso': 'Ajustar el volumen de la música para mejorar la experiencia en el local.',
};

function classifyChunkWithMock(comments) {
  return comments.map((comment) => {
    const text = comment.toLowerCase();
    const category = MOCK_CATEGORIES.find((cat) => cat.keywords.some((k) => text.includes(k)));
    if (category) {
      return { sentiment: category.sentiment, theme: category.theme };
    }
    if (MOCK_NEGATIVE_HINTS.some((k) => text.includes(k))) {
      return { sentiment: 'negative', theme: 'Experiencia negativa general' };
    }
    if (MOCK_POSITIVE_HINTS.some((k) => text.includes(k))) {
      return { sentiment: 'positive', theme: 'Experiencia positiva general' };
    }
    return { sentiment: 'neutral', theme: 'General' };
  });
}

function topThemes(counts, limit = 5) {
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([theme, mentions]) => ({ theme, mentions }));
}

function summarizeWithMock({ positiveCounts, negativeCounts }) {
  const negativeThemes = topThemes(negativeCounts);
  const recommendedActions = negativeThemes
    .map((t) => MOCK_ACTIONS[t.theme])
    .filter(Boolean)
    .slice(0, 5);
  if (recommendedActions.length === 0) {
    recommendedActions.push('Mantener la calidad actual y monitorear el feedback de forma continua.');
  }
  return {
    positiveThemes: topThemes(positiveCounts),
    negativeThemes,
    recommendedActions,
  };
}

// ---------------------------------------------------------------------------
// Interfaz pública: elige analizador según configuración
// ---------------------------------------------------------------------------

function useMock() {
  return env.mockAi || !env.anthropicApiKey;
}

async function classifyChunk(comments) {
  return useMock() ? classifyChunkWithMock(comments) : classifyChunkWithClaude(comments);
}

async function summarize(input) {
  return useMock() ? summarizeWithMock(input) : summarizeWithClaude(input);
}

module.exports = { classifyChunk, summarize, useMock };
