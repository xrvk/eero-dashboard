# Installation

**On this page:**

- [Docker (Recommended)](#docker)
- [Synology NAS](#synology)
- [Common Commands](#common-commands)
- [Local Development](#local-dev)

## Docker (Recommended)

A single container serves both the frontend and API on port **8420**.

**Prerequisites:** [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/)

### Option A: Pre-built image from GHCR (fastest)

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

### Option B: Build from source

```bash
git clone https://github.com/xrvk/eero-dashboard.git
cd eero-dashboard
docker compose up -d --build
```

## Synology NAS (Container Manager)

1.  Create a folder: **File Station → docker → eero-dashboard**
2.  Create a `data` subfolder inside it for persistent storage
3.  Place the `docker-compose.yml` from Option A above into the `eero-dashboard` folder
4.  Open **Container Manager → Project → Create**
5.  Set **Project name** to `eero-dashboard`
6.  Set **Path** to `/docker/eero-dashboard`
7.  It will auto-detect the compose file — click **Next → Done**

The dashboard will be available at `http://<NAS-IP>:8420`.

Speed history and eero session data are stored in `docker/eero-dashboard/data/`, visible in File Station.

## Common Commands

```bash
# Stop
docker compose down

# View logs
docker compose logs -f
```

Speed history and session data are persisted in the `data/` directory (bind-mounted via Docker). Your data survives container rebuilds and image updates.

## Local Development

Run the backend and frontend separately for development with hot-reload.

**Prerequisites:** Python 3.12+, Node.js 22+

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

The API server runs on **http://localhost:8420**.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The dev server runs on **http://localhost:5173** and proxies `/api` requests to the backend.
