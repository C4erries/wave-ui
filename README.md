# wave-ui

React + Vite + TypeScript UI for the wave-mq broker (single-node prototype with mock data by default).

## Quick start

```bash
npm install
npm run dev
```

Open the dev server URL from the console (Vite default is http://localhost:5173).

## Environment variables

- `VITE_API_BASE_URL` – base URL for future wave-mq admin HTTP API (default `http://localhost:8090`).
- `VITE_METRICS_URL` – Prometheus `/metrics` endpoint (defaults to `${VITE_API_BASE_URL}/metrics`).
- `VITE_USE_MOCKS` – set to `false` to call real endpoints once the backend exists. Defaults to `true`.

## Available scripts

- `npm run dev` – start Vite dev server.
- `npm run build` – type-check (`tsc`) and build production assets.
- `npm run preview` – preview the production build.
- `npm run lint` – type-check only.

## Pages & features

- **Dashboard** – broker ID, endpoints, quick health/metrics link, topic summary.
- **Topics** – topics table; **Topic Details** shows partitions and a simple message browser (partition/offset/limit form).
- **Consumer Groups** – list of groups with members, topic/partition assignments, and lag placeholders.
- **Metrics** – pulls Prometheus text, parses `messages_produced_total`, `messages_consumed_total`, `request_errors_total`, and latency histograms (`produce_latency_seconds`, `fetch_latency_seconds`). Shows percentile cards, histograms, and per-topic throughput (computed from successive samples).
- **Data Analysis** – pick topic/partition/last N messages, parse numeric payloads, compute min/max/mean/median, p50/p90/p95/p99, std, RMS; render waveform and histogram.

## API layer

- `src/api/brokerApi.ts` – helpers for future REST endpoints:
  - `GET /api/broker` → broker info
  - `GET /api/summary` → overview counts
  - `GET /api/topics` → list topics
  - `GET /api/topics/:name` → topic details (partitions, replication)
  - `GET /api/topics/:name/partitions/:id/messages?offset&limit` → messages for browser
  - `GET /api/consumers` → consumer groups
  - `VITE_USE_MOCKS` toggles between real calls and `src/api/mockBrokerApi.ts`.
- `src/api/metricsApi.ts` – fetches Prometheus text, parses counters/histograms, derives latency percentiles and bucket densities.

## Project structure

- `src/pages` – Dashboard, Topics, TopicDetails, ConsumerGroups, Metrics, DataAnalysis.
- `src/components` – layout (sidebar/topbar), cards, charts (throughput, waveform, histogram).
- `src/api` – broker/metrics clients + mock data.
- `src/types` – shared DTOs.
- `src/utils` – formatting and basic stats helpers.

## Notes

- Recharts is used for lightweight visualizations.
- Mock data is shipped so the UI builds and renders without a live backend.
- Use Node.js 20.19+ or 22.12+ for Vite 7; older patch versions may emit warnings.
