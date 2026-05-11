# Frontend Architecture

## Entry point

**`main.tsx`** renders `<App />` inside `<StrictMode>`. No router library — navigation is tab-based state managed in `App.tsx`.

## Root component (`App.tsx`)

`App.tsx` owns all top-level state:

| State | Type | Purpose |
|-------|------|---------|
| `auth` | `AuthStatus \| null` | Current auth status |
| `checking` | `boolean` | Initial auth check in progress |
| `networks` | `Network[]` | User's eero networks |
| `selectedNetwork` | `string \| null` | Active network ID |
| `tab` | `AppTab` | Current view (devices, activity, profiles, settings-*) |
| `theme` | `dark \| light \| auto` | Persisted to localStorage |

### Render logic

```
checking?    → spinner
!auth?       → <LoginForm />
else         → <AppSidebar /> + <AppContent />
```

### Key effects

- **On mount:** `checkAuth()` → fetch auth status → load networks → auto-select first network
- **On network select:** Fire `prefetch(selectedNetwork)` which warms **both** the backend TTL cache and the frontend response cache (see [Data flow](./data-flow.md))
- **On theme change:** Set `data-theme` attribute on `<html>`, persist to localStorage

## API layer

### `api/client.ts` — Base request handler

```ts
request<T>(path: string, options?: RequestInit): Promise<T>
```

- Prepends `/api` base path
- Sets `Content-Type: application/json`
- Extracts error messages from `{ detail, error.message }` on failure
- All API modules use this as their HTTP primitive

### `api/devices.ts` — Feature API module

Typed functions: `getDevices()`, `pauseDevice()`, `blockDevice()`, `setDeviceNickname()`, `getDevicePriority()`, `setDevicePriority()`.

### `api.ts` — Legacy barrel

Re-exports everything from `api/devices.ts` plus all other API functions (networks, auth, settings, profiles, etc.) and TypeScript type definitions. Existing components import from here. New code should prefer feature-scoped imports.

**Key types defined here:** `AuthStatus`, `Network`, `EeroNode`, `Profile`, `Device`, `SecuritySettings`, `ForwardEntry`, `ReservationEntry`, `BlacklistEntry`, `NetworkSettingsSummary`.

## Hooks

### `useFetch<T>(fetcher, deps, options, cacheKey?)`

Shared data-fetching hook used by all components.

| Return | Type | Purpose |
|--------|------|---------|
| `data` | `T \| null` | Latest fetched data |
| `loading` | `boolean` | Request in flight |
| `error` | `string \| null` | Error message |
| `status` | `idle \| loading \| success \| error` | Fetch lifecycle |
| `refetch()` | function | Manual re-trigger |
| `cancel()` | function | Abort in-flight request |

**Features:**
- Dependency-based re-fetch (like `useEffect` deps)
- Configurable retry count + delay
- AbortController cleanup on unmount
- StrictMode-safe: detects aborted fetch on remount and re-triggers
- **Frontend response cache:** When `cacheKey` is provided (typically the API path), data is stored in a module-level `Map`. On subsequent mounts, data is read synchronously — no loading spinner flash.
- `prefetchRequest(path, fetcher)` can populate the cache before any component mounts

**Usage pattern:**
```tsx
const { data, loading, error } = useFetch(
  () => api.getDevices(networkId),
  [networkId],
  {},
  `/networks/${networkId}/devices`,  // cacheKey for instant re-mount
);
```

## Features

### `features/app/AppContent.tsx` — Tab router

All tab components are **eagerly imported** — no `React.lazy()` or `Suspense`. This eliminates the loading spinner flash on first tab visit.

> **Design decision:** Lazy loading was removed because the perceived half-second delay from `Suspense` fallbacks was worse than the slightly larger initial bundle. Since the frontend prefetch already warms the response cache before any tab is visited, eager imports make tab switching feel instant.

| Tab | Component |
|-----|-----------|
| `devices` | `DeviceList` |
| `activity` | `ActivityView` |
| `profiles` | `ProfileManager` |
| `settings-general` | `GeneralSettings` |
| `settings-forwards` | `PortForwardsSettings` |
| `settings-reservations` | `DhcpReservationsSettings` |
| `settings-guest` | `GuestNetwork` |
| `settings-blacklist` | `BlacklistSettings` |

### `features/app/AppSidebar.tsx` — Navigation

Renders network selector dropdown, tab navigation buttons, eero node status indicators, and speed widget.

### `features/devices/client.ts` — Feature-scoped device client

Thin wrapper that re-exports device API functions under a `devicesClient` object for use by `DeviceList`.

## Components

| Component | File | Purpose |
|-----------|------|---------|
| `LoginForm` | `LoginForm.tsx` | Email/phone → verification code 2FA flow |
| `DeviceList` | `DeviceList.tsx` | Device grid/list with filtering, sorting, grouping by node |
| `DeviceDrawer` | `DeviceDrawer.tsx` | Slide-out device detail panel (priority, DHCP reservation) |
| `NodeDrawer` | `NodeDrawer.tsx` | Slide-out node detail panel (LED, firmware, connectivity) |
| `ActivityView` | `ActivityView.tsx` | Speed test trigger + network health monitoring |
| `ProfileManager` | `ProfileManager.tsx` | Parental controls: pause, bedtime, content filters, scheduling |
| `SettingsView` | `SettingsView.tsx` | Multi-section: security, DNS, SQM, port forwards, DHCP, blacklist |
| `GuestNetwork` | `GuestNetwork.tsx` | Guest network enable/disable + credentials |
| `SpeedHistory` | `SpeedHistory.tsx` | Recharts line chart of historical speed test data |

`SettingsView.tsx` exports multiple named components: `GeneralSettings`, `PortForwardsSettings`, `DhcpReservationsSettings`, `BlacklistSettings`.

## Styling

- **Plain CSS** — `index.css` (global), `App.css` (layout)
- **Theme:** Dark / light / auto via `data-theme` attribute on `<html>`
- **CSS variables** for colors, shadows, and gradients: `--bg-card`, `--text`, `--accent`, `--shadow-card`, `--gradient-card`, etc.
- **Typography:** DM Sans (body), JetBrains Mono (monospace values)
- **Icons:** Lucide React (`lucide-react`) — all icons are SVG components with `currentColor`
- **Atmosphere:** Radial gradient overlays on body/login, gradient card surfaces, glow shadows on hover
- **Animations:** Staggered card reveal, tab slide-fade, hover lift transforms
- **Layout:** CSS Grid (sidebar + main) and Flexbox
- **Charts:** Recharts library

## Build tooling

| Tool | Version | Purpose |
|------|---------|---------|
| Vite | 8.x | Dev server (port 5173) + production bundler |
| TypeScript | 6.x | Type checking (`tsc -b`) |
| ESLint | 10.x | Linting with react-hooks + react-refresh plugins |
| Vitest | 4.x | Unit tests (jsdom environment) |
| React | 19.x | UI framework |
| Recharts | 3.8 | Speed history charting |
| Lucide React | 1.x | SVG icon components |

### Scripts

```
npm run dev        # Start Vite dev server
npm run build      # tsc -b && vite build
npm run typecheck  # tsc -b (type check only)
npm run lint       # eslint .
npm run test       # vitest run
```

### Vite proxy

In development, Vite proxies `/api` requests to `http://localhost:8420`:

```ts
server: {
  port: 5173,
  proxy: { '/api': { target: 'http://localhost:8420', changeOrigin: true } }
}
```

In production, FastAPI serves the built frontend from `backend/static/`.
