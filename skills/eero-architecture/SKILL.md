---
name: eero-architecture
description: "Enforce eero Dashboard architecture patterns for both frontend and backend code. Use this skill when creating new components, API endpoints, services, or feature modules. Also use when refactoring, reviewing architecture decisions, or working with React Contexts, the cache layer, facade pattern, or feature module structure. Triggers: new feature, new endpoint, new component, refactor, architecture, context, cache, facade, service, router."
---

Enforce architecture patterns for the eero Dashboard — a React 19 + TypeScript frontend with Python/FastAPI backend managing eero mesh Wi-Fi networks.

## Project Structure

```
eero-dashboard/
├── backend/
│   ├── main.py              # App init, middleware, remaining endpoints
│   ├── core/
│   │   ├── client.py        # EeroClient singleton lifecycle
│   │   ├── cache.py         # In-memory TTL cache (5 min)
│   │   ├── facade.py        # Wraps client._api.* — services use this
│   │   └── errors.py        # Error translation helpers
│   ├── features/
│   │   ├── auth/            # router.py → service.py → schemas.py
│   │   ├── devices/
│   │   ├── networks/
│   │   ├── network_ops/
│   │   └── profiles/
│   └── data/                # Persisted session + speed history
├── frontend/
│   ├── src/
│   │   ├── App.tsx          # Root: auth gate → sidebar + content
│   │   ├── api/             # Typed fetch wrappers (by feature)
│   │   ├── features/app/    # ThemeContext, AuthContext, NetworkContext
│   │   ├── hooks/           # useFetch
│   │   ├── components/      # UI views + shared/ primitives
│   │   └── test/factories.ts
│   └── vite.config.ts
└── docs/
```

## Backend Patterns

### Feature Module Structure

Every new backend feature follows: **router → service → schemas**

```python
# features/my_feature/router.py
from fastapi import APIRouter
router = APIRouter()

# features/my_feature/service.py
from backend.core import cache, facade
from backend.core.errors import translate_errors

# features/my_feature/schemas.py (optional)
from pydantic import BaseModel
```

Register routers in `main.py`:
```python
app.include_router(my_feature_router, prefix="/api")
```

### Facade Pattern (CRITICAL)

Services must **never** access `client._api` directly. Always use `core/facade.py`:

```python
# ❌ WRONG
result = await client._api.profiles.post(network_url, data)

# ✅ CORRECT
from backend.core.facade import create_profile
result = await create_profile(client, network_url, data)
```

### Cache Key Convention

Always use `cache.keys.*` methods — never hardcode f-string keys:

```python
# ❌ WRONG
cache.get(f"net:{network_id}:devices")

# ✅ CORRECT
cache.get(cache.keys.device_list(network_id))
```

Available key generators: `networks_list`, `network`, `eeros`, `settings`, `password`, `security`, `dns`, `sqm`, `updates`, `thread`, `routing`, `blacklist`, `forwards`, `reservations`, `activity`, `activity_sub`, `diagnostics`, plus device/profile variants.

### Mutation Flow

Every mutation must:
1. Call the eero API via facade
2. Invalidate affected cache keys
3. Call `cache.clear_upstream()` to clear eero-api internal cache

```python
async def pause_device(client, network_id, device_id, paused):
    with translate_errors("pause_device"):
        await client.set_device_paused(device_id, paused)
        cache.invalidate(cache.keys.device_prefix(network_id))
        cache.clear_upstream()
```

### Error Handling

All errors use consistent JSON shape via `translate_errors()` context manager:

```python
with translate_errors("operation_name"):
    result = await some_operation()
    # Exceptions → HTTPException → { error: { code, message, status }, detail }
```

## Frontend Patterns

### React Contexts (not prop drilling)

State lives in context providers, not passed through App.tsx:

| Provider | Context | Hook | State |
|---|---|---|---|
| `ThemeProvider` | `ThemeContext` | `useTheme()` | theme, setTheme |
| `NetworkProvider` | `NetworkContext` | `useNetwork()` | networks, selectedNetwork, eeros |
| `AuthProvider` | `AuthContext` | `useAuth()` | auth, checking, logout |

Provider nesting: `ThemeProvider → NetworkProvider → AuthProvider → AppMain`

### useFetch Hook

**Every `useFetch()` call must include a `cacheKey`** matching the API path:

```tsx
// ✅ CORRECT — with cacheKey for prefetch warm-up
const { data, loading, error, refetch } = useFetch(
  () => api.getDevices(networkId),
  [networkId],
  {},
  `/networks/${networkId}/devices`,  // cacheKey
);

// ❌ WRONG — missing cacheKey breaks prefetch
const { data } = useFetch(() => api.getDevices(networkId), [networkId]);
```

### API Layer

API functions live in feature-scoped modules under `api/`:
- `api/client.ts` — base `request<T>()` handler
- `api/auth.ts`, `api/devices.ts`, `api/networks.ts`, etc.
- `api.ts` — barrel re-export (legacy imports still work)

New code should prefer feature-scoped imports:
```tsx
import { getDevices } from './api/devices';
// not: import * as api from '../api';
```

### Component Organization

| Location | Purpose |
|---|---|
| `components/` | Page-level views (DeviceList, ActivityView, etc.) |
| `components/shared/` | Reusable UI primitives (CopyableValue, ErrorBoundary) |
| `features/app/` | App shell, contexts, sidebar, content router |
| `features/devices/` | Feature-scoped client wrappers |

### ErrorBoundary Wrapping

Each tab in AppContent is wrapped in an `ErrorBoundary` for crash isolation — a crash in Devices doesn't take down Profiles.

### Eager Imports (no lazy loading)

All tab components are **eagerly imported** — no `React.lazy()` or `Suspense`. The prefetch warm-up makes tab switching instant without loading spinners.

### Prefetch Pattern

On network select, `NetworkProvider` fires `prefetch(selectedNetwork)`:
1. `POST /api/prefetch/{id}` → backend fires 12 parallel eero API calls
2. 14 parallel GET requests → responses stored in `_responseCache`
3. On component mount, `useFetch` reads cache synchronously — no spinner flash

## Key Rules

1. **Backend facade**: Always use `core/facade.py` — never `client._api.*` in services
2. **Cache keys**: Always use `cache.keys.*` — never hardcode f-strings
3. **Upstream cache**: Every mutation must call `cache.clear_upstream()`
4. **useFetch cacheKey**: Every `useFetch()` must include the API path as `cacheKey`
5. **Context over props**: Use React Contexts — avoid prop drilling from App.tsx
6. **Feature modules**: Follow router → service → schemas pattern
7. **Error handling**: Use `translate_errors()` context manager for all API operations
