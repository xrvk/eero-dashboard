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
- **On network select:** Fire `prefetch(selectedNetwork)` (fire-and-forget) to warm backend cache
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

### `useFetch<T>(fetcher, deps, options)`

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

**Usage pattern:**
```tsx
const { data, loading, error } = useFetch(
  () => api.getDevices(networkId),
  [networkId]
);
```

## Features

### `features/app/AppContent.tsx` — Tab router

Maps `tab` prop to lazy-loaded components via `React.lazy()` + `<Suspense>`:

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
| `ActivityView` | `ActivityView.tsx` | Speed test trigger + network health monitoring |
| `EeroNodes` | `EeroNodes.tsx` | eero node status cards with mesh quality indicators |
| `ProfileManager` | `ProfileManager.tsx` | Parental controls: pause, bedtime, content filters, scheduling |
| `SettingsView` | `SettingsView.tsx` | Multi-section: security, DNS, SQM, port forwards, DHCP, blacklist |
| `GuestNetwork` | `GuestNetwork.tsx` | Guest network enable/disable + credentials |
| `SpeedHistory` | `SpeedHistory.tsx` | Recharts line chart of historical speed test data |

`SettingsView.tsx` exports multiple named components: `GeneralSettings`, `PortForwardsSettings`, `DhcpReservationsSettings`, `BlacklistSettings`.

## Styling

- **Plain CSS** — `index.css` (global), `App.css` (layout)
- **Theme:** Dark / light / auto via `data-theme` attribute on `<html>`
- **CSS variables** for colors: `--bg-card`, `--text`, `--accent`, `--border`, etc.
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
