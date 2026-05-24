# Backend Architecture

**Sections:**

- [Core Modules](#core-modules)
- [Feature Modules](#feature-modules)
- [Endpoints in main.py](#main-endpoints)
- [Speed Test Flow](#speed-test-flow)

## Core Modules

### `core/client.py` — EeroClient Lifecycle

Global singleton pattern. One `EeroClient` instance per app lifetime.

| Function | Purpose |
|----|----|
| `ensure_client()` | Lazy-init client, persists auth to `data/.eero_session` cookie file |
| `get_client()` | Returns authenticated client or raises 401 |
| `is_authenticated()` | Quick flag check (no network call) |
| `reset_client()` | Close → reinitialize (called after logout) |
| `lifespan()` | FastAPI lifespan context: init on startup, close on shutdown |

The client uses the `eero-api` library (`EeroClient` class) which wraps the unofficial eero cloud REST API. Auth state is stored in a cookie file (`data/.eero_session`), not in memory, so it survives restarts and container rebuilds when the `data/` directory is volume-mounted.

### `core/cache.py` — In-memory TTL Cache

Simple dict-based cache: `{key: (expiry_monotonic, value)}`.

| Function | Purpose |
|----|----|
| `get(key)` | Return value if not expired, else `None` |
| `put(key, value, ttl)` | Store with monotonic expiry (default 300s) |
| `cached(key, factory, ttl)` | Check cache → call `factory()` on miss → store → return |
| `invalidate(prefix)` | Delete all keys starting with prefix |
| `invalidate_network(id)` | Shorthand for `invalidate(f"net:{id}:")` + clear upstream |
| `clear()` | Flush everything |
| `clear_upstream(*cats)` | Clear eero-api client's internal cache for given categories |

**Cache key convention:** Always use `cache.keys.*` methods — never hardcode f-strings.

```
cache.keys.device_list(network_id)    # "net:{id}:device:list"
cache.keys.security(network_id)       # "net:{id}:security"
cache.keys.profile(network_id, pid)   # "net:{id}:profile:{pid}"
```

Available key generators: `networks_list`, `network`, `eeros`, `settings`, `password`, `security`, `dns`, `sqm`, `updates`, `thread`, `routing`, `blacklist`, `forwards`, `reservations`, `activity`, `activity_sub`, `diagnostics`, plus device/profile prefix/list/detail/sub variants.

**TTL:** 5 minutes. Mutations call `invalidate()` on affected keys so stale data is never served after a write.

**Upstream cache clearing:** Every mutation **must** call `cache.clear_upstream()` to also clear the eero-api library's internal cache.

### `core/facade.py` — eero-api Facade

Wraps `client._api.*` access behind clean async functions. Service modules should **never** access `client._api` directly.

| Function | Wraps |
|----|----|
| `create_profile()` | `client._api.profiles.post(...)` |
| `rename_profile()` | `client._api.profiles.put(...)` |
| `delete_profile()` | `client._api.profiles.delete(...)` |
| `add_to_blacklist()` | `client._api.blacklist.add_to_blacklist(...)` |
| `remove_from_blacklist()` | `client._api.blacklist.remove_from_blacklist(...)` |
| `create_forward()` | `client._api.forwards.create_forward(...)` |
| `delete_forward()` | `client._api.forwards.delete_forward(...)` |
| `create_reservation()` | `client._api.reservations.create_reservation(...)` |
| `delete_reservation()` | `client._api.reservations.delete_reservation(...)` |

### `core/errors.py` — Error Handling

All API errors use a consistent JSON shape:

```json
{
  "error": { "code": "list_devices_failed", "message": "...", "status": 500 },
  "detail": "..."
}
```

- `api_error_response()` — builds the response dict
- `translate_errors()` — context manager that catches exceptions and converts to `HTTPException`

## Feature Modules

Each feature folder follows the pattern: **router → service → schemas**.

### `features/auth/`

Handles eero account login via email/phone + SMS/email verification code.

| Route              | Method | Purpose                               |
|--------------------|--------|---------------------------------------|
| `/api/auth/status` | GET    | Check auth state, return name/email   |
| `/api/auth/login`  | POST   | Send verification code to email/phone |
| `/api/auth/verify` | POST   | Submit verification code              |
| `/api/auth/logout` | POST   | Clear session, reset client           |

Login detects phone vs email by regex and returns a message hinting where the code was sent.

### `features/devices/`

Device CRUD with caching and cache invalidation on mutations.

| Route | Method | Purpose |
|----|----|----|
| `/api/networks/{id}/devices` | GET | List all devices (cached) |
| `/api/networks/{id}/devices/{did}` | GET | Single device detail (cached) |
| `/api/networks/{id}/devices/{did}/pause` | POST | Pause/unpause internet |
| `/api/networks/{id}/devices/{did}/block` | POST | Block/unblock device |
| `/api/networks/{id}/devices/{did}/nickname` | POST | Set display name |
| `/api/networks/{id}/devices/{did}/priority` | GET/POST | Priority boost |

All mutations invalidate `net:{id}:device*` cache keys.

### `features/networks/`

Read-only network info. All endpoints are cached.

| Route | Method | Purpose |
|----|----|----|
| `/api/networks` | GET | List user's networks |
| `/api/networks/{id}` | GET | Network detail (name, speed, status) |
| `/api/networks/{id}/eeros` | GET | eero node list (gateway, mesh quality) |
| `/api/networks/{id}/settings` | GET | Aggregated settings object |

`get_settings()` calls `get_network()` upstream and extracts a curated subset (name, password, timezone, SQM, DNS, guest network, etc.).

### `features/profiles/`

Profile (parental control) management. Handles CRUD, pause, bedtime schedules, content filtering, and device assignment.

| Route | Method | Purpose |
|----|----|----|
| `/api/networks/{id}/profiles` | GET | List all profiles |
| `/api/networks/{id}/profiles` | POST | Create new profile |
| `/api/networks/{id}/profiles/{pid}` | GET | Single profile detail |
| `/api/networks/{id}/profiles/{pid}/pause` | POST | Pause/unpause profile internet |
| `/api/networks/{id}/profiles/{pid}/blocked-apps` | GET | List blocked apps |
| `/api/networks/{id}/profiles/{pid}/blocked-apps` | POST | Update blocked apps |
| `/api/networks/{id}/profiles/{pid}/bedtime` | POST | Set bedtime schedule |
| `/api/networks/{id}/profiles/{pid}/schedule` | GET | Get internet schedule |
| `/api/networks/{id}/profiles/{pid}/schedule/set` | POST | Set internet schedule |
| `/api/networks/{id}/profiles/{pid}/schedule` | DELETE | Clear internet schedule |
| `/api/networks/{id}/profiles/{pid}/devices` | PUT | Assign devices to profile |
| `/api/networks/{id}/profiles/{pid}/rename` | PUT | Rename profile |
| `/api/networks/{id}/profiles/{pid}` | DELETE | Delete profile |

All mutations invalidate `net:{id}:profiles` cache keys.

### `features/network_ops/`

Complex operations: prefetch, DNS, activity monitoring, diagnostics.

| Route | Method | Purpose |
|----|----|----|
| `/api/prefetch/{id}` | POST | Warm cache with 12 parallel eero API calls |
| `/api/networks/{id}/dns` | GET | DNS settings (cached) |
| `/api/networks/{id}/dns/mode` | POST | Set DNS mode + custom servers |
| `/api/networks/{id}/dns/caching` | POST | Toggle DNS caching |
| `/api/networks/{id}/activity` | GET | Current network activity |
| `/api/networks/{id}/activity/history` | GET | Activity by period (day/week/month) |
| `/api/networks/{id}/activity/clients` | GET | Per-client breakdown |
| `/api/networks/{id}/activity/categories` | GET | Per-category breakdown |
| `/api/networks/{id}/diagnostics` | GET/POST | Fetch/run diagnostics |

DNS mutations call `cache.invalidate_network()` since DNS changes affect multiple views.

## Endpoints in `main.py`

These haven't been decomposed into feature modules yet:

| Category | Endpoints |
|----|----|
| Health | `GET /api/health` |
| Speed test | `POST /api/networks/{id}/speed-test`, `GET /api/networks/{id}/speed-history` |
| Security | `GET/PATCH /api/networks/{id}/security` |
| Port forwards | `GET/POST /api/networks/{id}/forwards`, `DELETE .../forwards/{fid}` |
| DHCP reservations | `GET/POST /api/networks/{id}/reservations`, `DELETE .../reservations/{rid}` |
| Password & name | `GET /api/networks/{id}/password`, `POST .../name` |
| Guest network | `POST /api/networks/{id}/guest` |
| Node detail | `GET /api/networks/{id}/eeros/{eid}` |
| Node reboot | `POST /api/networks/{id}/eeros/{eid}/reboot` |
| Node LED & nightlight | `GET/POST .../eeros/{eid}/led`, `.../led/brightness`, `.../nightlight` |
| SQM / QoS | `GET/POST /api/networks/{id}/sqm`, `POST .../sqm/configure`, `.../sqm/auto` |
| Firmware updates | `GET /api/networks/{id}/updates` |
| Thread / routing | `GET /api/networks/{id}/thread`, `.../routing` |
| Blacklist | `GET/POST/DELETE /api/networks/{id}/blacklist/{did}` |
| Network reboot | `POST /api/networks/{id}/reboot` |

**Decomposition opportunity:** These can be migrated to feature modules following the same router/service/schemas pattern.

## Speed Test Flow

The speed test is a polling-based operation:

1.  Snapshot the current `speed.date` from network detail
2.  Call `client.run_speed_test()` (returns 202 accepted)
3.  Poll `client.get_network(refresh_cache=True)` every 10s
4.  When `speed.date` changes → save result to `speed_history.json` → return
5.  Timeout after 120s → return 504

Results are persisted to `backend/data/speed_history.json` with automatic pruning (default 365 days).
