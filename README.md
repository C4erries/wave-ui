# wave-ui

React + Vite + TypeScript UI for the wave-mq broker (single-node prototype with mock data by default).

## Quick start

```bash
npm install
npm run dev
```

Open the dev server URL from the console (Vite default is http://localhost:5173).

## Environment variables & runtime wiring

- `VITE_USE_MOCKS` – set to `false` in production docker builds so the UI talks to a live broker (mock data remains the default in local dev).
- `VITE_API_BASE_URL` – optional HTTP API base. When empty (as configured in both `docker-compose.single.yml` and `docker-compose.yml`) requests resolve to `/api/...`, keeping assets agnostic to the broker host and letting nginx proxy `/api` to `http://broker:8090`.
- `VITE_METRICS_URL` – optional Prometheus `/metrics` endpoint. When not provided it resolves to `/metrics` (or `${VITE_API_BASE_URL}/metrics` when a base is set) so the built UI always uses relative URLs inside the container.
- Leave both `VITE_API_BASE_URL` and `VITE_METRICS_URL` empty inside Docker Compose so the UI relies on nginx for proxying rather than hardcoding the broker address.

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

## Cluster & metrics insights

- `/api/controller` and `/api/cluster` feed the Topbar and Dashboard so you can see controller mode, Raft term/state, peers, and ClusterMetadata (topics, partitions, leaders, replicas, ISR) at a glance.
- The Topbar displays the current mode, Raft state, peer list, and a subtle banner when Raft + RF>1 is running to remind users that replication is experimental.
- The Dashboard now includes a cluster metadata summary, a Prometheus snapshot (total produced/consumed messages and request errors), and latency percentile panels derived from `/metrics`.
- Topic Details shows per-partition leader/replica/ISR rows sourced from `/api/cluster`, highlighting which brokers host each replica.

## Notes

- Recharts is used for lightweight visualizations.
- Mock data is shipped so the UI builds and renders without a live backend.
- Use Node.js 20.19+ or 22.12+ for Vite 7; older patch versions may emit warnings.
- `npm run build` runs `tsc && vite build` so you can verify the bundle before deploying inside the Docker image.

## Docker / nginx proxy
- nginx.conf proxies `/api` and `/metrics` to `http://broker:8090` and serves the built assets from `/usr/share/nginx/html`.
- Dockerfile copies `nginx.conf` to `/etc/nginx/conf.d/default.conf`, builds the Vite static assets with `VITE_USE_MOCKS=false`, and leaves `VITE_API_BASE_URL`/`VITE_METRICS_URL` empty so the UI always resolves `/api`/`/metrics` relative to the nginx host.
- `docker-compose.single.yml` brings up `broker` and `wave-ui`; inside the UI container nginx proxies `/api` and `/metrics` to `http://broker:8090`.
- `docker-compose.yml` brings up a Raft pair (`broker1`, `broker2`) plus `wave-ui`. `broker1` advertises the alias `broker`, allowing nginx to keep pointing at `http://broker:8090` while the cluster enters Raft mode for replication. Keep the UI env vars empty for both compose files so the same nginx proxy chain works in single and cluster deployments alike.

