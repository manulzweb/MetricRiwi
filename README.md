# 📊 FeedbackAI

SaaS MVP que ayuda a pequeños negocios (restaurantes, cafés, comidas rápidas) a entender el feedback de sus clientes automáticamente usando IA: sube un CSV de reseñas o pega comentarios, y obtén en tiempo real el sentimiento general, las principales quejas y elogios, y acciones recomendadas.

## Arquitectura

```
[Dashboard SPA] --(HTTP POST /upload)--> [Express API]
                                              |
                                       (encola el job)
                                              v
[Dashboard SPA] <--(Socket.io progreso)-- [Redis + BullMQ]
       |                                      |
(actualiza la UI)                     (worker procesa el job)
       |                                      v
       +<------(Socket.io complete)--- [IA Claude + PostgreSQL]
```

- **Frontend:** SPA en Vanilla JS (ES6 modules) + Tailwind CSS + DaisyUI. Sin frameworks.
- **Backend:** Node.js + Express (rutas → controladores → servicios → modelos).
- **Base de datos:** PostgreSQL (UUID, JSONB para temas y acciones).
- **Procesamiento asíncrono:** Redis + BullMQ. El servidor responde `202 Accepted` al instante y un **worker en proceso aparte** hace el trabajo pesado con reintentos y rate limiting.
- **Tiempo real:** Socket.io con autenticación JWT en el handshake y adapter/emitter de Redis para que el worker emita `job_progress` / `job_complete` a la sala del análisis.
- **IA:** API de Claude (`claude-opus-4-8` por defecto, structured outputs). Sin `ANTHROPIC_API_KEY` (o con `MOCK_AI=true`) se usa un analizador mock determinista para desarrollo y demos sin costo.
- **Seguridad:** JWT (7 días), bcrypt (12 rounds), validación de propiedad en cada recurso y salas de socket.

## Puesta en marcha

Requisitos: Node.js 20+, Docker (o PostgreSQL 16 y Redis 7 locales).

```bash
# 1. Infraestructura
docker compose up -d

# 2. Configuración
cp .env.example .env       # opcional: agrega tu ANTHROPIC_API_KEY

# 3. Dependencias y esquema
npm install
npm run migrate

# 4. Levantar servidor y worker (dos terminales)
npm run dev                # API + SPA en http://localhost:3000
npm run worker:dev         # worker de análisis
```

Abre `http://localhost:3000`, regístrate, y sube `samples/comentarios.csv` para ver el flujo completo (progreso en vivo → reporte).

## Variables de entorno

| Variable | Descripción | Default |
|---|---|---|
| `PORT` | Puerto del servidor HTTP | `3000` |
| `DATABASE_URL` | Conexión PostgreSQL | `postgres://feedbackai:feedbackai@localhost:5432/feedbackai` |
| `REDIS_URL` | Conexión Redis (BullMQ + Socket.io) | `redis://localhost:6379` |
| `JWT_SECRET` | Secreto para firmar tokens (obligatorio en prod) | — |
| `JWT_EXPIRES_IN` | Vigencia del token | `7d` |
| `ANTHROPIC_API_KEY` | API key de Claude; vacío ⇒ modo mock | — |
| `ANTHROPIC_MODEL` | Modelo de Claude | `claude-opus-4-8` |
| `MOCK_AI` | Forzar analizador mock | `false` |

## API

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/api/auth/register` | Crear cuenta `{email, password}` → `{user, token}` |
| `POST` | `/api/auth/login` | Iniciar sesión → `{user, token}` |
| `GET` | `/api/auth/me` | Usuario actual (Bearer) |
| `POST` | `/api/analysis/upload` | CSV (`multipart`, campo `file`) o JSON `{title, text}` → **202** `{analysisId, jobId, totalComments}` |
| `GET` | `/api/analysis/history` | Análisis del usuario con conteo de comentarios |
| `GET` | `/api/analysis/:id` | Reporte completo + comentarios con sentimiento |

**Eventos Socket.io** (auth: `{ token }` en el handshake):

| Dirección | Evento | Payload |
|---|---|---|
| cliente → servidor | `join_room` | `analysisId` (+ ack `{ok, status}`) |
| servidor → cliente | `job_progress` | `{analysisId, processed, total, percent, statusText}` |
| servidor → cliente | `job_complete` | `{analysisId}` |
| servidor → cliente | `job_failed` | `{analysisId, message}` |

## Estructura

```
backend/
  config/        # env, pool de PostgreSQL, factoría de clientes Redis
  controllers/   # capa HTTP (sin lógica de negocio)
  services/      # lógica de negocio (auth, análisis, IA)
  models/        # acceso a datos (SQL parametrizado)
  routes/        # definición de endpoints Express
  middlewares/   # JWT, multer (CSV 2MB), manejo central de errores
  queues/        # definición de la cola BullMQ
  workers/       # proceso worker: chunking, IA, persistencia, eventos
  sockets/       # servidor Socket.io (JWT + salas) y emitter para el worker
  db/            # schema.sql + script de migración
frontend/
  index.html     # shell de la SPA (Tailwind + DaisyUI + socket.io por CDN)
  src/
    pages/       # login, registro, dashboard, historial, reporte
    components/  # navbar, toasts
    services/    # cliente API (fetch + JWT) y cliente de sockets
    router.js    # router por hash con guard de autenticación
```

## Roadmap

- [x] Fase 1: Autenticación JWT + esquema de BD
- [x] Fase 2: Ingesta CSV/texto + cola Redis/BullMQ
- [x] Fase 3: Worker de IA + progreso en tiempo real
- [x] Fase 4: Dashboard SPA con reporte de insights
- [ ] Siguientes: comparativas semana a semana, más nichos (hoteles, clínicas), export PDF, multiusuario por negocio
