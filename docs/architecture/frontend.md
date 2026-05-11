# Frontend Architecture

## Entry point

**`main.tsx`** renders `<App />` inside `<StrictMode>`. No router library — navigation is tab-based state managed via `useHashRoute` hook. Global state lives in React Contexts (Theme, Auth, Network) rather than prop drilling from App.tsx.

## Root component (`App.tsx`)

`App.tsx` wraps the app in context providers and delegates state management:

| Provider | Context | State Managed |
|----------|---------|--------------|
| `ThemeProvider` | `ThemeContext` | theme (dark/light/auto), localStorage sync |
| `NetworkProvider` | `NetworkContext` | networks, selectedNetwork, networkDetail, eeros, prefetch |
| `AuthProvider` | `AuthContext` | auth status, checkAuth flow, logout |

### Render logic

```
ThemeProvider → NetworkProvider → AuthProvider → AppMain
  checking?    → spinner
  !auth?       → <LoginForm />
  else         → <AppSidebar /> + <AppContent />
```

### Key effects

- **On mount:** `AuthProvider.checkAuth()` → fetch auth status → load networks → auto-select first
- **On network select:** `NetworkProvider` fires `prefetch(selectedNetwork)` which warms **both** the backend TTL cache and the frontend response cache (see [Data flow](./data-flow.md))
- **On theme change:** `ThemeProvider` sets `data-theme` attribute on `<html>`, persists to localStorage

## API layer

All API functions live in feature-scoped modules under `api/`. The top-level `api.ts` is a thin re-export barrel (`export * from './api/index'`) so existing `import * as api from '../api'` imports continue to work.

### `api/client.ts` — Base request handler

```ts
request<T>(path: string, options?: RequestInit): Promise<T>
```

- Prepends `/api` base path
- Sets `Content-Type: application/json`
- Extracts error messages from `{ detail, error.message }` on failure
- All API modules use this as their HTTP primitive

### `api/types.ts` — Shared types

Cross-cutting types used by multiple modules: `SqmSettings`, `GuestNetworkSettings`, `DnsSettingsData`, `DnsCustomConfig`, `FirmwareUpdate`.

### `api/auth.ts` — Authentication

`AuthStatus` type. Functions: `getAuthStatus()`, `login()`, `verify()`, `logout()`.

### `api/networks.ts` — Networks & speed

`Network`, `SpeedHistoryEntry` types. Functions: `getNetworks()`, `getNetwork()`, `runSpeedTest()`, `getSpeedHistory()`.

### `api/eeros.ts` — Eero nodes

`EeroNode` type. Functions: `getEeros()`, `getEero()`, `prefetchEero()`, `rebootEero()`, `getLedStatus()`, `setLed()`, `setLedBrightness()`, `getNightlight()`, `setNightlight()`.

### `api/devices.ts` — Devices

`Device` type. Functions: `getDevices()`, `getDevice()`, `pauseDevice()`, `blockDevice()`, `setDeviceNickname()`, `renameDevice()`, `getDevicePriority()`, `setDevicePriority()`.

### `api/profiles.ts` — Profiles & parental controls

`Profile` type. Functions: `getProfiles()`, `createProfile()`, `renameProfile()`, `deleteProfile()`, `pauseProfile()`, `setBedtime()`, `getBlockedApps()`, `setBlockedApps()`, `setProfileDevices()`, `getProfileSchedule()`, `setProfileScheduleFull()`, `setWeekdayBedtime()`, `setWeekendBedtime()`, `clearProfileSchedule()`, `updateContentFilter()`, `updateBlockList()`.

### `api/settings.ts` — Network settings

Types: `SecuritySettings`, `ForwardEntry`, `ReservationEntry`, `BlacklistEntry`, `DiagnosticsResult`, `NetworkSettingsSummary`. Functions for security, DNS, port forwarding, reservations, SQM, blacklist, firmware updates, network reboot, password, guest network, thread, routing, and diagnostics.

### `api/activity.ts` — Activity & health

Functions: `getActivity()`, `getActivityHistory()`, `getActivityClients()`, `getActivityCategories()`.

### `api/prefetch.ts` — Cache warming

`prefetch()` warms both the backend TTL cache and the frontend response cache on network select.

### `api.ts` — Legacy barrel

Re-exports everything from `api/index.ts`. Existing components import from here. New code should prefer feature-scoped imports (e.g. `import { getDevices } from './api/devices'`).

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

### `features/app/ThemeContext.tsx` — Theme management

Provides `useTheme()` hook returning `{ theme, setTheme }`. Handles localStorage persistence and `data-theme` attribute sync.

### `features/app/AuthContext.tsx` — Authentication state

Provides `useAuth()` hook returning `{ auth, checking, checkAuth, logout }`. Manages the auth lifecycle including initial status check.

### `features/app/NetworkContext.tsx` — Network data

Provides `useNetwork()` hook returning `{ networks, selectedNetwork, setSelectedNetwork, networkDetail, eeros, setNetworks }`. Owns data fetching (via `useFetch`) and prefetch triggering.

### `features/app/AppContent.tsx` — Tab router

All tab components are **eagerly imported** — no `React.lazy()` or `Suspense`. Each tab is wrapped in an `ErrorBoundary` for per-feature crash isolation (a crash in Devices doesn't take down Profiles).

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

### `features/app/types.ts` — Shared types

| Type | Values | Purpose |
|------|--------|---------|
| `AppTab` | `devices`, `activity`, `profiles`, `settings-*` | Tab navigation IDs |
| `SignalFilter` | `all`, `excellent`, `good`, `fair`, `poor` | Signal quality click-through filter |
| `BandClickFilter` | `all`, `2.4ghz`, `5ghz`, `6ghz`, `wired` | Band click-through filter from Health tab |

### Cross-tab click-throughs (Health → Devices)

The Health tab (`ActivityView`) has clickable stat rows in "Clients by Band" and "Signal Quality" panels. Clicking a row navigates to the Devices tab with a URL filter parameter:

```
Health tab band row click    →  #/devices?band=5ghz
Health tab signal row click  →  #/devices?signal=excellent
```

The flow is: `ActivityView` → `onBandClick`/`onSignalClick` callback → `App.tsx` calls `setRoute('devices', { band })` → `useHashRoute` updates URL hash → `DeviceList` reads `bandClickFilter`/`signalFilter` prop and applies the filter. Both filters show a dismissible chip in the DeviceList toolbar.

`ActivityView` also calls `prefetchRequest` on mount for the devices endpoint, ensuring the response cache is warm even if the initial prefetch has expired.

### `features/devices/client.ts` — Feature-scoped device client

Thin wrapper that re-exports device API functions under a `devicesClient` object for use by `DeviceList`.

## Components

| Component | File | Purpose |
|-----------|------|---------|
| `CopyableValue` | `shared/CopyableValue.tsx` | Click-to-copy monospace value with feedback |
| `ErrorBoundary` | `shared/ErrorBoundary.tsx` | Per-feature crash isolation with retry button |
| `LoginForm` | `LoginForm.tsx` | Email/phone → verification code 2FA flow |
| `DeviceList` | `devices/` | Device grid/list with filtering, sorting, grouping by node. Split into sub-components: `DeviceCard`, `TableRowMenu`, plus `utils.ts` for `getDeviceIcon` and connectivity helpers. |
| `DeviceDrawer` | `DeviceDrawer.tsx` | Slide-out device detail panel (priority, DHCP reservation) |
| `NodeDrawer` | `NodeDrawer.tsx` | Slide-out node detail panel (LED, firmware, connectivity) |
| `ActivityView` | `ActivityView.tsx` | Speed test trigger + network health monitoring |
| `ClickableStatRow` | `ClickableStatRow.tsx` | Shared clickable bar-chart row used by Health tab band/signal sections |
| `ProfileManager` | `profiles/` | Parental controls: pause, bedtime, content filters, scheduling. Split into sub-components: `ProfileDetailPanel`, `DevicesTab`, `ScheduleTab`, `BlockedAppsTab`, `DevicePicker`, `CreateProfileForm`, `InlineEditName`, `EeroPlusBanner`, plus `utils.ts` for helpers. |
| `SettingsView` | `SettingsView.tsx` → `settings/` | Barrel re-export; individual components split into `components/settings/` (SecuritySettings, DnsSettings, GeneralSettings, SqmSettings, PortForwardsSettings, DhcpReservationsSettings, BlacklistSettings) |
| `GuestNetwork` | `GuestNetwork.tsx` | Guest network enable/disable + credentials |
| `SpeedHistory` | `SpeedHistory.tsx` | Recharts line chart of historical speed test data |

`SettingsView.tsx` exports multiple named components: `GeneralSettings`, `PortForwardsSettings`, `DhcpReservationsSettings`, `BlacklistSettings`.

## Styling

- **Plain CSS** — `index.css` is an import aggregator that loads split files from `styles/`:
  - `styles/variables.css` — CSS custom properties (`:root`, `[data-theme]`, color-scheme media query)
  - `styles/base.css` — Reset (`*`), `body`, and app-loading spinner
  - `styles/layout.css` — App shell: sidebar, header, main content area, theme toggle, sidebar speed widget
  - `styles/components.css` — All UI components: cards, buttons, toggles, forms, tables, tabs, badges, filters, etc.
  - `styles/drawers.css` — Slide-out drawer panels (device drawer, node drawer)
  - `styles/charts.css` — Speed history charts, tooltips, speed table
  - `styles/animations.css` — `@keyframes` definitions and spinner
  - `styles/responsive.css` — All `@media` breakpoint overrides
- **`App.css`** — Additional layout styles
- **Theme:** Dark / light / auto via `data-theme` attribute on `<html>`
- **CSS variables** for colors, shadows, and gradients: `--bg-card`, `--text`, `--accent`, etc.
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
