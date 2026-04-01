# wave-ui

`wave-ui` is the browser UI for `wave-mq`. It is tuned for preview use with the single-node broker and the same-origin Docker Compose setup.

## Preview status

- Dashboard, Topics, Topic Details, Consumer Groups, Metrics, Cluster, and Data Analysis are the main screens.
- The UI is aligned with the current broker contract for the preview path.
- Browser-level smoke is still a useful next step, but the app builds and lints cleanly.

## Quick start

Local dev:

```bash
npm install
npm run dev
```

Preview build:

```bash
npm run build
npm run preview
```

Docker preview from the repo root:

```powershell
docker compose -f .\docker-compose.single.yml up --build
```

That stack exposes the UI on `http://localhost:8080`.

## Environment variables

- `VITE_API_BASE_URL` - optional HTTP API base URL. If empty, the UI uses relative `/api/...` paths.
- `VITE_METRICS_URL` - optional Prometheus endpoint. If empty, the UI uses relative `/metrics`.

## Pages

- `Dashboard`
- `Topics`
- `Topic Details`
- `Consumer Groups`
- `Metrics`
- `Cluster`
- `Data Analysis`

## API surface used by the UI

- `GET /api/broker`
- `GET /api/summary`
- `GET /api/controller`
- `GET /api/cluster`
- `GET /api/topics`
- `GET /api/topics/:name`
- `GET /api/topics/:name/messages`
- `GET /api/topics/:name/partitions/:id/messages`
- `POST /api/topics`
- `POST /api/topics/:name/messages`
- `GET /api/consumers`
- `GET /metrics`

## Notes

- Keep the compose preview flow same-origin when possible.
- For a remote broker, set `VITE_API_BASE_URL` and `VITE_METRICS_URL` explicitly.
- Root preview entrypoint: [../README.md](../README.md)
