export function showToast(message, type = 'info') {
  const container = document.getElementById('toasts');
  const alert = document.createElement('div');
  alert.className = `alert alert-${type} shadow-lg`;
  alert.innerHTML = `<span></span>`;
  alert.querySelector('span').textContent = message;
  container.appendChild(alert);
  setTimeout(() => alert.remove(), 4000);
}
