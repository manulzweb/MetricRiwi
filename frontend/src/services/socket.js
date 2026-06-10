import { getToken } from './api.js';

let socket = null;

function getSocket() {
  if (!socket || socket.disconnected) {
    // eslint-disable-next-line no-undef -- io viene del script /socket.io/socket.io.js
    socket = io({ auth: { token: getToken() } });
  }
  return socket;
}

// Se suscribe al progreso de un análisis. Devuelve una función para desuscribirse.
export function watchAnalysis(analysisId, { onJoin, onProgress, onComplete, onFailed }) {
  const s = getSocket();

  const handleProgress = (p) => p.analysisId === analysisId && onProgress?.(p);
  const handleComplete = (p) => p.analysisId === analysisId && onComplete?.(p);
  const handleFailed = (p) => p.analysisId === analysisId && onFailed?.(p);

  s.on('job_progress', handleProgress);
  s.on('job_complete', handleComplete);
  s.on('job_failed', handleFailed);

  const join = () => s.emit('join_room', analysisId, (ack) => onJoin?.(ack));
  if (s.connected) join();
  else s.once('connect', join);

  return () => {
    s.emit('leave_room', analysisId);
    s.off('job_progress', handleProgress);
    s.off('job_complete', handleComplete);
    s.off('job_failed', handleFailed);
  };
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
