const TOKEN_KEY = 'feedbackai_token';
const USER_KEY = 'feedbackai_user';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getUser() {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function saveSession({ token, user }) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function isAuthenticated() {
  return Boolean(getToken());
}

async function request(path, { method = 'GET', body, isForm = false } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body && !isForm) headers['Content-Type'] = 'application/json';

  const res = await fetch(`/api${path}`, {
    method,
    headers,
    body: isForm ? body : body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && isAuthenticated()) {
    clearSession();
    window.location.hash = '#/login';
    throw new Error('Tu sesión expiró. Inicia sesión de nuevo.');
  }

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.error?.message || 'Error inesperado');
  }
  return json.data;
}

export const api = {
  register: (email, password) => request('/auth/register', { method: 'POST', body: { email, password } }),
  login: (email, password) => request('/auth/login', { method: 'POST', body: { email, password } }),
  uploadAnalysis: (formData) => request('/analysis/upload', { method: 'POST', body: formData, isForm: true }),
  uploadText: (title, text) => request('/analysis/upload', { method: 'POST', body: { title, text } }),
  getHistory: () => request('/analysis/history'),
  getAnalysis: (id) => request(`/analysis/${id}`),
};
