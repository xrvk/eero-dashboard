---
name: eero-api-conventions
description: "Enforce eero Dashboard backend API conventions for cache management, mutation flows, error handling, and data flow patterns. Use this skill when adding or modifying backend API endpoints, working with the cache layer, implementing mutations, handling errors, or touching the prefetch system. Triggers: cache, mutation, invalidate, endpoint, API route, service, prefetch, error handling, translate_errors, facade, upstream cache."
---

Enforce backend API conventions for the eero Dashboard — a FastAPI backend that proxies the unofficial eero cloud API with an in-memory TTL cache.

## Request Lifecycle

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

## Cache Layer (`core/cache.py`)

Simple dict-based cache: `{key: (expiry_monotonic, value)}`. Default TTL: 300 seconds (5 min).

### Key Functions

| Function | Purpose |
|---|---|
| `cache.get(key)` | Return value if not expired |
| `cache.put(key, value, ttl)` | Store with monotonic expiry |
| `cache.cached(key, factory, ttl)` | Check cache → call factory on miss → store → return |
| `cache.invalidate(prefix)` | Delete all keys starting with prefix |
| `cache.invalidate_network(id)` | Shorthand for `invalidate(f"net:{id}:")` + clear upstream |
| `cache.clear_upstream(*cats)` | Clear eero-api client's internal cache |

### Cache Key Rules (CRITICAL)

**Always use `cache.keys.*` methods — never hardcode f-string keys:**

```python
# ❌ WRONG — hardcoded keys break when convention changes
cache.get(f"net:{network_id}:devices")
cache.invalidate(f"net:{network_id}:device")

# ✅ CORRECT — centralized key generators
cache.get(cache.keys.device_list(network_id))
cache.invalidate(cache.keys.device_prefix(network_id))
```

### Available Key Generators

| Generator | Key Pattern |
|---|---|
| `cache.keys.networks_list()` | `networks` |
| `cache.keys.network(id)` | `net:{id}:network` |
| `cache.keys.eeros(id)` | `net:{id}:eeros` |
| `cache.keys.settings(id)` | `net:{id}:settings` |
| `cache.keys.password(id)` | `net:{id}:password` |
| `cache.keys.security(id)` | `net:{id}:security` |
| `cache.keys.dns(id)` | `net:{id}:dns` |
| `cache.keys.sqm(id)` | `net:{id}:sqm` |
| `cache.keys.updates(id)` | `net:{id}:updates` |
| `cache.keys.thread(id)` | `net:{id}:thread` |
| `cache.keys.routing(id)` | `net:{id}:routing` |
| `cache.keys.blacklist(id)` | `net:{id}:blacklist` |
| `cache.keys.forwards(id)` | `net:{id}:forwards` |
| `cache.keys.reservations(id)` | `net:{id}:reservations` |
| `cache.keys.activity(id)` | `net:{id}:activity` |
| `cache.keys.diagnostics(id)` | `net:{id}:diagnostics` |
| `cache.keys.device_list(id)` | `net:{id}:device:list` |
| `cache.keys.device_detail(id, did)` | `net:{id}:device:{did}` |
| `cache.keys.device_prefix(id)` | `net:{id}:device` |
| `cache.keys.profile_list(id)` | `net:{id}:profile:list` |
| `cache.keys.profile_detail(id, pid)` | `net:{id}:profile:{pid}` |

## Facade Pattern (`core/facade.py`)

Services must **never** access `client._api` directly. All eero-api internal calls go through the facade:

```python
# ❌ WRONG — direct _api access
result = await client._api.profiles.post(network_url, data)

# ✅ CORRECT — facade function
from backend.core.facade import create_profile
result = await create_profile(client, network_url, data)
```

Existing facade functions: `create_profile`, `rename_profile`, `delete_profile`, `add_to_blacklist`, `remove_from_blacklist`, `create_forward`, `delete_forward`, `create_reservation`, `delete_reservation`.

If you need a new `_api` call, **add it to `facade.py` first**, then use it in your service.

## Mutation Flow (CRITICAL)

Every mutation must follow this exact sequence:

```python
async def my_mutation(client, network_id, ...):
    with translate_errors("my_mutation"):
        # 1. Call eero API via facade or client method
        await facade.some_operation(client, ...)

        # 2. Invalidate affected cache keys
        cache.invalidate(cache.keys.some_prefix(network_id))

        # 3. ALWAYS clear upstream eero-api internal cache
        cache.clear_upstream()

        return result
```

**Forgetting `cache.clear_upstream()` causes stale data after mutations.**

### Invalidation Scope Reference

| Mutation | Cache Keys to Invalidate |
|---|---|
| Device pause/block/rename | `cache.keys.device_prefix(network_id)` |
| Device priority | `cache.keys.device_detail(network_id, device_id)` |
| Security settings | `cache.invalidate_network(network_id)` (broad) |
| DNS mode/caching | `cache.invalidate_network(network_id)` (broad) |
| SQM changes | `cache.keys.sqm(network_id)` |
| Port forward CRUD | `cache.keys.forwards(network_id)` |
| DHCP reservation CRUD | `cache.keys.reservations(network_id)` |
| Blacklist add/remove | `cache.keys.blacklist(network_id)` |
| Network name/guest/reboot | `cache.invalidate_network(network_id)` (broad) |
| Profile pause | `cache.keys.profile_list(network_id)` |
| Run diagnostics | `cache.keys.diagnostics(network_id)` |

## Error Handling (`core/errors.py`)

All API errors use a consistent JSON shape:

```json
{
  "error": { "code": "list_devices_failed", "message": "...", "status": 500 },
  "detail": "..."
}
```

Always wrap service operations in `translate_errors()`:

```python
from backend.core.errors import translate_errors

async def list_devices(client, network_id):
    with translate_errors("list_devices"):
        return await cache.cached(
            cache.keys.device_list(network_id),
            lambda: client.get_devices(network_id)
        )
```

## Prefetch System

`POST /api/prefetch/{network_id}` fires 12 parallel eero API calls to warm the backend cache. The frontend also sends 14 parallel GET requests to warm `_responseCache`.

When adding a new cacheable endpoint, consider:
1. Adding it to the prefetch list in `network_ops/service.py`
2. Adding a corresponding frontend prefetch call in `api/prefetch.ts`

## Endpoint Conventions

- All endpoints prefixed with `/api`
- RESTful: `GET` for reads, `POST` for actions/mutations, `DELETE` for removal
- Path params for resource IDs: `/networks/{network_id}/devices/{device_id}`
- Return JSON responses directly (FastAPI handles serialization)
- Auth check: use `get_client()` which raises 401 if not authenticated
