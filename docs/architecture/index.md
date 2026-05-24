# Architecture Overview

*Last updated: May 2025*

eero Dashboard is a self-hosted web app for managing eero mesh networks. It consists of a **FastAPI backend** that proxies the unofficial eero cloud API and a **React frontend** that renders the dashboard UI.

## Deployment Topology

```
┌─────────────────────────────────────┐
│       Browser (React SPA)           │
│  Port 5173 (dev) or Docker :8420    │
└──────────────┬──────────────────────┘
               │  /api/* requests
       Vite dev proxy (dev)
       or static mount (prod)
               │
┌──────────────▼──────────────────────┐
│   FastAPI + Uvicorn (port 8420)     │
│  core/  ─ client, cache, errors     │
│  features/ ─ auth, devices,         │
│              networks, network_ops, │
│              profiles               │
│  main.py ─ remaining endpoints      │
└──────────────┬──────────────────────┘
               │
       EeroClient (eero-api lib)
               │
┌──────────────▼──────────────────────┐
│      eero Cloud API (upstream)      │
└─────────────────────────────────────┘

Persistence (Docker volume → backend/data/):
  data/.eero_session       → auth cookie
  data/speed_history.json  → speed test results
```

## Directory Structure

```
eero-dashboard/
├── backend/
│   ├── main.py                  # App init, middleware, speed-test, remaining routes
│   ├── core/
│   │   ├── client.py            # EeroClient singleton lifecycle
│   │   ├── cache.py             # In-memory TTL cache (5 min)
│   │   └── errors.py            # Error translation helpers
│   ├── features/
│   │   ├── auth/                # Login / verify / logout
│   │   ├── devices/             # Device CRUD, pause, block, priority
│   │   ├── networks/            # Network info, eeros, settings
│   │   ├── network_ops/         # Prefetch, DNS, activity, diagnostics
│   │   └── profiles/            # Profile CRUD, pause, bedtime, schedule, content filters
│   ├── tests/
│   └── data/                    # Persisted speed history + auth session
├── frontend/
│   ├── src/
│   │   ├── App.tsx              # Root: auth gate → sidebar + content
│   │   ├── api/                 # Typed fetch wrappers
│   │   ├── api.ts               # Legacy barrel re-exports
│   │   ├── features/            # App shell + device client
│   │   ├── hooks/               # useFetch
│   │   └── components/          # All UI views
│   └── vite.config.ts           # Dev server + proxy + test config
├── docs/                        # This folder
├── Dockerfile                   # Multi-stage: node build → python runtime
└── docker-compose.yml           # Production deployment
```

## Key Documents

| Doc | Purpose |
|----|----|
| [Backend](backend.md) | Core modules, feature layers, caching, error handling |
| [Frontend](frontend.md) | Components, API layer, hooks, state management |
| [Data flow](data-flow.md) | Request lifecycle, caching strategy, mutation invalidation |
| [API reference](../api-reference.md) | REST endpoint catalog |
| [Contributing](../../CONTRIBUTING.md) | Dev setup, validation, safe-change checklist |
