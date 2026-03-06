# wave-ui

React + Vite + TypeScript UI for the Wave MQ broker.

## Quick start

```bash
npm install
npm run dev
```

Vite default URL: http://localhost:5173.

## Environment variables

- `VITE_API_BASE_URL` - optional HTTP API base. If empty, UI uses relative `/api/...`.
- `VITE_METRICS_URL` - optional Prometheus endpoint. If empty, UI uses relative `/metrics`.

No mock mode is used in runtime UI.

## Scripts

- `npm run dev` - start Vite dev server.
- `npm run build` - type-check and build production assets.
- `npm run preview` - preview production build.
- `npm run lint` - type-check only.

## API used by UI

- `GET /api/broker`
- `GET /api/summary`
- `GET /api/controller`
- `GET /api/cluster`
- `GET /api/topics`
- `GET /api/topics/:name`
- `GET /api/topics/:name/messages`
- `GET /api/topics/:name/partitions/:id/messages`
- `POST /api/topics`
- `POST /api/topics/:name/messages` (hash routing by key)
- `GET /api/consumers`
- `GET /metrics`

## Metrics

UI reads Wave MQ Prometheus metrics:

- `wavemq_messages_produced_total`
- `wavemq_messages_consumed_total`
- `wavemq_request_errors_total`
- `wavemq_produce_latency_seconds_*`
- `wavemq_fetch_latency_seconds_*`

## Docker / nginx

- `nginx.conf` proxies `/api` and `/metrics` to `http://broker:8090`.
- Dockerfile builds static assets and serves them via nginx.
- Keep `VITE_API_BASE_URL` and `VITE_METRICS_URL` empty in Compose to use nginx proxy chain.
