# Demo Mode

Demo mode turns the dashboard into a self-contained showcase: **authentication
is bypassed**, the user lands straight on the dashboard, and every read
endpoint serves a consistent set of synthetic data (one network, three eeros,
twenty devices, four profiles, two weeks of speed history, etc.). Mutations
return a no-op success response — nothing reaches the eero cloud.

This replaces the legacy standalone `mock-server.py` (now a deprecation shim).
The real FastAPI backend serves the same data behind a flag so there is one
demo mode, one entry point, and one source of truth.

## Quick start

```bash
EERO_DEMO_DATA=true python3 backend/main.py
# then, in another shell:
cd frontend && npm run dev
```

Open http://localhost:5173/ — you'll skip the login screen and see the demo
network "Home Network" populated with data. A yellow `🎭 Demo mode` banner
sits at the top of the dashboard so you (or a viewer of your screen
recording) can never mistake the synthetic data for the real thing.

### Docker

The base `docker-compose.yml` is production-safe and does **not** turn demo
mode on. To bring up a demo container, layer the override file:

```bash
docker compose -f docker-compose.yml -f docker-compose.demo.yml up
```

`docker-compose.demo.yml` adds only `EERO_DEMO_DATA=true` on top of the
base service definition.

## Enabling

`EERO_DEMO_DATA` accepts `true`, `1`, or `yes` (case-insensitive). Anything
else — including unset — leaves demo mode off.

```bash
export EERO_DEMO_DATA=true
```

```
# backend/.env
EERO_DEMO_DATA=true
```

```yaml
# docker-compose.yml
environment:
  EERO_DEMO_DATA: "true"
```

Demo mode is **off by default** — it must be explicitly enabled. Restart the
backend to toggle (the flag is read and cached once per process).

## Why it's gated

The demo data is intentionally striking — fiber-class speeds, 20 named
devices, fully-populated profiles — so it photographs well. Serving it to
real users by accident produces issues like
[#45](https://github.com/xrvk/eero-dashboard/issues/45), where users saw
~900/900 Mbps speed history that didn't match their actual plan. Gating
behind an explicit env flag makes that class of bug impossible.

## What demo mode does

| Surface | Behavior with `EERO_DEMO_DATA=true` |
|---|---|
| `/api/auth/status` | Returns `{authenticated: true, name: "Demo User", email: "demo@example.com"}` — no eero login required |
| `/api/networks`, `/api/networks/{id}`, `/devices`, `/eeros`, `/profiles`, `/settings`, `/security`, `/dns`, `/forwards`, `/reservations`, `/sqm`, `/updates`, `/thread`, `/routing`, `/blacklist`, `/diagnostics`, `/activity*`, `/speed-history` | Canned JSON from `backend/core/demo_data.py` |
| Per-device GET `/api/networks/{id}/devices/{device_id}` | Demo device lookup |
| Per-eero GET `/api/networks/{id}/eeros/{eero_id}` | Demo eero lookup |
| Any POST / PUT / PATCH / DELETE under `/api/*` | Returns `{"status": "ok", "data": {}, "_demo": true}` — no eero calls |
| `/api/health` | Always reaches the real handler; reports `demo_mode: true` |
| `/openapi.json`, `/docs`, static assets | Unchanged |

All synthetic data uses the same `NETWORK_ID = "fake-net-001"` so endpoints
are internally consistent.

## What demo mode does NOT do

- It is **not** dry-run mode. Dry-run (`EERO_DRY_RUN`) keeps real reads
  hitting the eero cloud and only blocks mutations. Demo mode synthesizes
  everything.
- It does **not** modify any persisted data. Existing
  `backend/data/speed_history.json` is ignored while demo mode is on for the
  speed-history endpoint — the canned 14-day series is served instead.
- It does **not** affect `/api/health`, so health probes still report the
  truth about the running process.

## Architecture

```
┌──────────┐     ┌──────────────────────┐     ┌─────────┐     ┌──────────────┐
│ Frontend │────▸│ DemoModeMiddleware   │────▸│  Router  │────▸│   Service    │
│          │     │ (intercepts /api/*   │     │          │     │ (only reached│
│          │◂────│  when demo on)       │     │          │     │  when demo   │
│          │     └──────────────────────┘     └─────────┘     │  off)        │
└──────────┘                                                   └──────────────┘
```

`DemoModeMiddleware` is registered before any router. When
`is_demo_mode()` is true and the request targets `/api/*` (excluding
`/api/health`), the middleware looks up the path in
`core.demo_data.get_static_routes()` (or matches the device/eero dynamic
patterns) and returns the canned response. Otherwise, the request flows
through to the real handler.

## Source files

| File | Role |
|---|---|
| `backend/core/demo.py` | `is_demo_mode()` flag parsing (cached once per process) |
| `backend/core/demo_data.py` | Canned `NETWORK`, `DEVICES`, `EERO_NODES`, `PROFILES`, `SPEED_HISTORY`, route map, lookup helpers |
| `backend/core/demo_middleware.py` | FastAPI middleware that intercepts `/api/*` requests |
| `backend/features/speed_test/service.py` | Uses `is_demo_mode()` to gate the seed fallback for `/speed-history` (covers the case where the middleware path isn't taken — e.g. real backend with no demo flag) |
| `backend/tests/test_demo_mode.py` | Unit + integration coverage |
| `mock-server.py` | Deprecation shim. Prints upgrade instructions and exits non-zero |

## Related flags

- `EERO_DRY_RUN` — see [dry-run-mode.md](./dry-run-mode.md). Independent of
  demo mode; can be combined, though demo mode already short-circuits
  mutations.

## Safety checklist before deploying

- [ ] `EERO_DEMO_DATA` is unset (or explicitly `false`) in production env
- [ ] `docker-compose.yml` / k8s manifests do not pass the flag through
      (the `demo-flag-guard` CI job enforces this on every PR)
- [ ] `/api/health` returns `demo_mode: false` on the running instance
- [ ] The `🎭 Demo mode` banner is **not** visible in the production UI
