# eero Dashboard

A web dashboard for managing your eero mesh WiFi network. Built with FastAPI + React.

<!-- TODO: Add screenshot of the dashboard overview here -->
<!-- ![Dashboard overview](docs/screenshots/dashboard.png) -->

> **Note:** Uses the unofficial [`eero-api`](https://github.com/fulviofreitas/eero-api) library. All API calls go through eero's cloud — there is no local API. Amazon-linked eero accounts are not supported.

See also:
- [CONTRIBUTING.md](./CONTRIBUTING.md)
- [Frontend README](./frontend/README.md)
- [API Reference](./docs/API_REFERENCE.md)

## Features

- 🔐 Email-based eero login with verification code
- 📶 Network overview (status, speed, client count)
- 📱 Connected device list with usage stats
- 📡 eero node status with mesh quality indicators
- 🚀 Speed test with history chart
- 🌙 Dark theme

---

## Hosting

### Docker (Recommended)

The easiest way to run eero Dashboard. A single container serves both the frontend and API on port **8420**.

**Prerequisites:** [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/)

#### Option A: Pre-built image from GHCR (fastest)

Create a `docker-compose.yml`:

```yaml
services:
  eero-dashboard:
    image: ghcr.io/xrvk/eero-dashboard:latest
    container_name: eero-dashboard
    ports:
      - "8420:8420"
    volumes:
      - eero-data:/app/backend/data
    environment:
      - SPEED_HISTORY_DAYS=365
    restart: unless-stopped

volumes:
  eero-data:
```

Then run:

```bash
docker compose up -d
```

To update to the latest version:

```bash
docker compose pull && docker compose up -d
```

#### Option B: Build from source

```bash
git clone https://github.com/xrvk/eero-dashboard.git
cd eero-dashboard
docker compose up -d --build
```

### Synology NAS (Container Manager)

1. Create a folder: **File Station → docker → eero-dashboard**
2. Place the `docker-compose.yml` from Option A above into that folder
3. Open **Container Manager → Project → Create**
4. Set **Project name** to `eero-dashboard`
5. Set **Path** to `/docker/eero-dashboard`
6. It will auto-detect the compose file — click **Next → Done**

The dashboard will be available at `http://<NAS-IP>:8420`.

### Common commands

To stop:

```bash
docker compose down
```

> Speed history and session data are persisted in a Docker volume (`eero-data`). Your data survives container rebuilds.

### Local Development

Run the backend and frontend separately for development with hot-reload.

**Prerequisites:** Python 3.12+, Node.js 22+

#### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

The API server runs on **http://localhost:8420**.

#### Frontend

```bash
cd frontend
npm install
npm run dev
```

The dev server runs on **http://localhost:5173** and proxies `/api` requests to the backend.

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `SPEED_HISTORY_DAYS` | `365` | Number of days to retain speed test history. Set to `0` to keep all results. |

Set variables in `docker-compose.yml` under `environment`, or export them in your shell for local development:

```bash
export SPEED_HISTORY_DAYS=90
```

---

## Architecture

```
backend/
  main.py                         # App wiring, middleware, shared endpoints
  core/
    client.py                     # eero client lifecycle/auth state
    errors.py                     # Shared backend error translation/shape helpers
  features/
    auth/
      router.py                   # /api/auth/* routes
      service.py                  # Auth/session behavior
    devices/
      router.py                   # /api/networks/{id}/devices* routes
      service.py                  # Device operations
    network_ops/
      router.py                   # Prefetch, DNS, activity, diagnostics routes
      service.py                  # Network operations behavior
      schemas.py                  # Request models for network ops
    networks/
      router.py                   # Network/profile/settings read routes
      service.py                  # Network/profile/settings fetch + shaping
  requirements.txt
  tests/
    test_api_smoke.py             # Backend API smoke coverage
frontend/
  src/
    api.ts                         # Typed API surface
    api/client.ts                  # Shared request/error handling
    hooks/useFetch.ts              # Shared loading/error/retry/cancel fetch pattern
    App.tsx                        # App entry + auth/network state
    features/app/                  # Sidebar/content feature containers
    components/
      LoginForm.tsx                # Auth flow
      DeviceList.tsx               # Connected devices + actions
      SettingsView.tsx             # Security/settings workflows
      ActivityView.tsx             # Speed tests & network activity
    **/*.test.tsx                  # Frontend component tests
docker-compose.yml     # Single-command Docker setup
Dockerfile             # Multi-stage build (Node + Python)
.github/workflows/
  container-sanity.yml             # Build + startup check for container boot/import sanity
  validate.yml                     # Frontend/backend validation on PRs
```

### Cache behavior

- The backend currently does **not** maintain a response cache for API reads.
- `/api/prefetch/{network_id}` only warms upstream eero API paths in parallel for faster subsequent reads.
- Speed test history is persisted to `data/speed_history.json` (inside the data volume) and pruned using `SPEED_HISTORY_DAYS`.
- The eero session cookie is persisted to `data/.eero_session` so logins survive container rebuilds.
- There is no automatic invalidation layer beyond upstream freshness and speed-history retention pruning.

## Validation and release checklist

- Root workflows: `npm run test` and `npm run validate`
- Backend: `python -m compileall backend` and `python -m unittest discover -s backend/tests`
- Frontend: `cd frontend && npm run lint && npm run typecheck && npm run build && npm run test`
- Container sanity: ensure `.github/workflows/container-sanity.yml` passes (image build + `/api/health` startup check)
- Before release: verify login/session, device actions, and key settings updates in a running build
