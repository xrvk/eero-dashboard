# eero Dashboard

A web dashboard for managing your eero mesh WiFi network. Built with FastAPI + React.

> **Note:** Uses the unofficial [`eero-api`](https://github.com/fulviofreitas/eero-api) library. All API calls go through eero's cloud — there is no local API. Amazon-linked eero accounts are not supported.

## Quick Start

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python main.py
```

The API server runs on `http://localhost:8420`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The dashboard runs on `http://localhost:5173` and proxies API requests to the backend.

## Features

- 🔐 Email-based eero login with verification code
- 📶 Network overview (status, speed, client count)
- 📱 Connected device list with usage stats
- 📡 eero node status with mesh quality indicators
- 🌙 Dark theme

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
```
