# Dry-Run Mode

Dry-run mode lets you test the dashboard locally without sending mutations to the eero cloud API. Read operations (GET) work normally; write operations (POST/PUT/DELETE) are blocked with a `403` response.

## Enabling

Set the `EERO_DRY_RUN` environment variable:

```bash
# Any of these values enable dry-run mode
export EERO_DRY_RUN=true   # also accepts: 1, yes, TRUE
```

Or add it to your `.env` file:

```
EERO_DRY_RUN=true
```

Or in `docker-compose.yml`:

```yaml
environment:
  EERO_DRY_RUN: "true"
```

Dry-run is **off by default** — it must be explicitly enabled.

## Behavior

| Operation Type | Behavior in Dry-Run |
|---|---|
| **Read** (GET) | Normal — hits the live eero API |
| **Mutation** (POST/PUT/DELETE) | Blocked — returns HTTP 403 |

When a mutation is blocked, the response looks like:

```json
{
  "code": "dry_run_blocked",
  "message": "'set_guest_network' is not available in dry-run mode. ..."
}
```

The server logs each blocked mutation:

```
WARNING  DRY-RUN: blocked unmocked mutation: set_guest_network
```

## How It Works

1. **`is_dry_run()`** reads `EERO_DRY_RUN` from the environment on first call, then caches the result for the process lifetime (restart required to toggle).
2. **Service-layer guards** — each mutation service function checks `is_dry_run()` before calling the eero API client. If active, it calls `block_unmocked_mutation(operation_name)` which raises an `HTTPException(403)`.
3. **No data is modified** — the eero client methods are never invoked, so no network state changes.

```
┌──────────┐     ┌─────────┐     ┌──────────────┐     ┌──────────┐
│ Frontend │────▸│  Router  │────▸│   Service    │──X──│ EeroClient│
│          │     │          │     │ (dry-run     │     │          │
│          │◂────│          │◂────│  guard here) │     │          │
│          │ 403 │          │     └──────────────┘     └──────────┘
└──────────┘     └─────────┘
```

## Affected Operations

All mutation endpoints are guarded, including:

- **Profiles** — create, rename, delete, pause, set devices, set schedule, set blocked apps
- **Security** — WPA3, band steering, UPnP, IPv6, Thread
- **SQM** — enable/disable, configure, auto mode
- **DNS** — mode, caching
- **Network** — rename, guest network, reboot
- **Devices** — pause, block, nickname, priority
- **Port Forwards** — create, delete
- **Reservations** — create, delete
- **Blacklist** — add, remove
- **Diagnostics** — run diagnostics

## Source Files

| File | Role |
|---|---|
| `backend/core/dry_run.py` | `is_dry_run()`, `block_unmocked_mutation()`, mock helpers |
| `backend/features/*/service.py` | Dry-run guards at the top of each mutation function |
| `backend/tests/test_dry_run.py` | Unit tests for flag parsing, blocking, and integration |
