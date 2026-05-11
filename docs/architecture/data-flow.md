# Data Flow & Caching

## Request lifecycle

A typical read request flows through five layers:

```
 Component          useFetch(() => api.getDevices(networkId))
     │
 API client          fetch("/api/networks/{id}/devices")
     │
 Vite proxy          → http://localhost:8420 (dev only)
     │
 FastAPI router      features/devices/router.py → service.list_devices()
     │
 Service + cache     cache.cached("net:{id}:devices", λ → client.get_devices())
     │                    ├─ cache hit  → return immediately (~1ms)
     │                    └─ cache miss → call eero cloud API (~300-500ms)
     │
 eero cloud API      https://api-user.e2ro.com/2.2/networks/{id}/devices
```

## Caching strategy

### Cache layer

The backend uses a simple in-memory TTL cache (`core/cache.py`). No external cache (Redis, etc.) is needed since the app is single-process.

| Property | Value |
|----------|-------|
| Storage | Python dict in process memory |
| Default TTL | 300 seconds (5 minutes) |
| Key format | `net:{network_id}:{resource}` |
| Invalidation | Prefix-based deletion |

### Cache key catalog

| Key pattern | Populated by |
|-------------|-------------|
| `networks` | `networks/service.list_networks()` |
| `net:{id}:network` | `networks/service.get_network()`, prefetch |
| `net:{id}:devices` | `devices/service.list_devices()`, prefetch |
| `net:{id}:device:{did}` | `devices/service.get_device()` |
| `net:{id}:device:{did}:priority` | `devices/service.get_device_priority()` |
| `net:{id}:eeros` | `networks/service.list_eeros()`, prefetch |
| `net:{id}:profiles` | `networks/service.list_profiles()`, prefetch |
| `net:{id}:settings` | `networks/service.get_settings()` |
| `net:{id}:security` | `main.get_security()`, prefetch |
| `net:{id}:dns` | `network_ops/service.get_dns()`, prefetch |
| `net:{id}:sqm` | `main.get_sqm()`, prefetch |
| `net:{id}:forwards` | `main.get_forwards()`, prefetch |
| `net:{id}:reservations` | `main.get_reservations()`, prefetch |
| `net:{id}:updates` | `main.get_updates()`, prefetch |
| `net:{id}:thread` | `main.get_thread()`, prefetch |
| `net:{id}:blacklist` | `main.get_blacklist()`, prefetch |
| `net:{id}:routing` | `main.get_routing()` |
| `net:{id}:password` | `main.get_password()` |
| `net:{id}:activity` | `network_ops/service.get_activity()` |
| `net:{id}:activity:history:{period}` | `network_ops/service.get_activity_history()` |
| `net:{id}:activity:clients` | `network_ops/service.get_activity_clients()` |
| `net:{id}:activity:categories` | `network_ops/service.get_activity_categories()` |
| `net:{id}:diagnostics` | `network_ops/service.get_diagnostics()` |

### Prefetch

When the user selects a network, the frontend fires `POST /api/prefetch/{network_id}` (fire-and-forget). The backend runs **12 parallel eero API calls** and stores results in cache. This means the first time the user visits any tab, data is already cached.

```
Frontend:  api.prefetch(selectedNetwork)  // fire-and-forget on network select
Backend:   asyncio.gather(
             get_network, get_devices, get_eeros, get_profiles,
             get_security, get_dns, get_updates, get_thread,
             get_blacklist, get_sqm, get_forwards, get_reservations
           )
           → each result stored with cache.put(key, result)
```

Endpoints not covered by prefetch (activity, diagnostics, routing, password) are cached on first access.

## Mutation flow

Mutations follow a write-then-invalidate pattern:

```
 Component          api.pauseDevice(networkId, deviceId, true)
     │
 Service            client.pause_device(deviceId, true)
     │               cache.invalidate("net:{id}:device")    ← bust all device cache
     │
 Component          refetch()  → useFetch re-triggers
     │
 Service            cache miss → fresh data from eero API
```

### Invalidation scope

| Mutation | Cache keys invalidated |
|----------|----------------------|
| Device pause/block/rename | `net:{id}:device*` (all device entries) |
| Device priority | `net:{id}:device:{did}*` (specific device) |
| Security settings | `net:{id}:*` (entire network — broad) |
| DNS mode/caching | `net:{id}:*` (entire network) |
| SQM changes | `net:{id}:sqm` |
| Port forward create/delete | `net:{id}:forwards` |
| DHCP reservation create/delete | `net:{id}:reservations` |
| Blacklist add/remove | `net:{id}:blacklist` |
| Network name/guest/reboot | `net:{id}:*` (entire network) |
| Profile pause | `net:{id}:profiles` |
| Run diagnostics | `net:{id}:diagnostics` |

## Frontend state management

No state management library. All state lives in `App.tsx` root component and is passed down as props.

```
App.tsx
├── auth, networks, selectedNetwork, tab, theme
├── <AppSidebar />     ← receives networks, eeros, tab setter
└── <AppContent />     ← receives selectedNetwork, tab
    └── <DeviceList /> ← uses useFetch internally, owns its own loading/data/error
```

Each leaf component manages its own fetch state via `useFetch`. No global data store.

## Error handling

### Backend

```
Service function
  └─ translate_errors() context manager
       └─ catches Exception → HTTPException({ code, message, status })
            └─ http_exception_handler() in main.py
                 └─ JSONResponse({ error: { code, message, status }, detail })
```

### Frontend

```
api/client.ts request()
  └─ res.ok?
       ├─ yes → return parsed JSON
       └─ no  → extract message from { detail, error.message }
                → throw Error(message)
                     └─ useFetch catches → sets error state
                          └─ component renders error banner
```

## Environment variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `SPEED_HISTORY_DAYS` | `365` | Speed test history retention |
| `SPEED_TEST_POLL_INTERVAL` | `10` | Seconds between speed test polls |
| `SPEED_TEST_TIMEOUT` | `120` | Max seconds to wait for speed test |
