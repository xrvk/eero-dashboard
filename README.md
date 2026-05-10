# eero Dashboard

A web dashboard for managing your eero mesh WiFi network. Built with FastAPI + React.

<!-- TODO: Add screenshot of the dashboard overview here -->
<!-- ![Dashboard overview](docs/screenshots/dashboard.png) -->

> **Note:** Uses the unofficial [`eero-api`](https://github.com/fulviofreitas/eero-api) library. All API calls go through eero's cloud — there is no local API. Amazon-linked eero accounts are not supported.

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

```bash
git clone https://github.com/xrvk/eero-dashboard.git
cd eero-dashboard
docker compose up -d
```

The dashboard is now running at **http://localhost:8420**.

To rebuild after pulling updates:

```bash
docker compose up -d --build
```

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
  main.py              # FastAPI app wrapping eero-api
  requirements.txt
frontend/
  src/
    api.ts             # API client
    App.tsx            # Main app shell
    components/
      LoginForm.tsx    # Auth flow
      DeviceList.tsx   # Connected devices
      EeroNodes.tsx    # Mesh node status
      ActivityView.tsx # Speed tests & network activity
docker-compose.yml     # Single-command Docker setup
Dockerfile             # Multi-stage build (Node + Python)
```
