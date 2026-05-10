# eero Dashboard — Copilot Instructions

## Project Overview
A web dashboard for managing eero mesh WiFi networks. Uses the **unofficial** `eero-api` Python library (cloud-based, not local). Built for an eero Max 7 + eero Pro 6E mesh setup.

## Architecture

```
backend/          FastAPI (Python 3.12+)
  main.py         Single-file API server wrapping eero-api
  .venv/          Python virtual environment
  .eero_session   Cookie file for auth persistence (gitignored)

frontend/         React 19 + TypeScript + Vite 8
  src/
    api.ts        API client (all fetch calls to /api/*)
    App.tsx       Main shell: sidebar nav, header, tab routing
    hooks/
      useFetch.ts Generic async data hook
    components/
      DeviceList.tsx      Devices page (grid/list, filters, search, sort)
      ActivityView.tsx    Health page (speed test, band/signal charts, node cards)
      ProfileManager.tsx  Profiles page (accordion with device picker)
      EeroNodes.tsx       Node cards (used inside ActivityView)
      LoginForm.tsx       Auth flow (email → verification code)
      SettingsView.tsx    Exports: SecuritySettings, DnsSettings, PortForwardsSettings,
                          DhcpReservationsSettings, DiagnosticsSettings
    index.css     All styles (single file, dark theme, CSS variables)
```

## Running

```bash
# Backend (port 8420)
cd backend && source .venv/bin/activate && python main.py

# Frontend (port 5173, proxies /api to backend)
cd frontend && npm run dev
```

## Key Technical Facts

### eero-api Library
- Requires **Python 3.12+** (Homebrew: `/opt/homebrew/bin/python3.12`)
- Auth uses `cookie_file` parameter (not keyring) — stored at `backend/.eero_session`
- `EeroClient` must be used as async context manager (`__aenter__`/`__aexit__`)
- `is_authenticated` is a **property**, not a method
- `login()` and `verify()` return **bool**, not dicts
- Method `get_dns_settings` (not `get_dns`)
- Port forward/reservation CRUD is on low-level modules: `client._api.forwards.create_forward()`, `client._api.reservations.create_reservation()`
- **Amazon-linked eero accounts are NOT supported** — must use email/phone login
- Activity, transfer stats, and insights endpoints return **403** without eero Plus subscription
- Device `usage` field is always null/0 — use `connectivity` data instead (signal, bitrate, frequency, packets)
- No documented API rate limits; library has `EeroRateLimitException`

### Frontend Patterns
- **Single CSS file** (`index.css`) with CSS variables for theming
- **Dark theme only** — variables: `--bg`, `--bg-card`, `--accent`, `--green`, `--red`, etc.
- **No component library** — all UI is custom CSS
- **useFetch hook** for all data loading (returns `{ data, loading, error, refetch }`)
- **Sidebar navigation** with always-expanded Settings sub-items
- **Device list** supports: grid/list view, status filter (all/online/offline), band filter (all/wired/wireless), group by node, column sorting, search
- **Wireless auto-groups by band** (2.4/5/6 GHz) when band filter is "wireless" and no explicit grouping
- Confirm dialogs use overlay + animation (`fadeIn`, `slideUp`)
- Delete actions use **double-click confirm** (first click shows ⚠️)

### API Endpoints (backend)
- Auth: `GET /api/auth/status`, `POST /api/auth/login`, `POST /api/auth/verify`, `POST /api/auth/logout`
- Networks: `GET /api/networks`, `GET /api/networks/{id}`
- Devices: `GET /api/networks/{id}/devices`, `POST .../devices/{mac}/pause`, `POST .../devices/{mac}/block`, `POST .../devices/{mac}/rename`
- Eeros: `GET /api/networks/{id}/eeros`, `POST .../eeros/{eid}/reboot`
- Profiles: `GET .../profiles`, `POST .../profiles/{pid}/pause`, `PUT .../profiles/{pid}/devices`
- DNS: `GET .../dns`, `POST .../dns/mode`, `POST .../dns/caching`
- Security: `GET .../security`, `PATCH .../security`
- Forwards: `GET .../forwards`, `POST .../forwards`, `DELETE .../forwards/{fid}`
- Reservations: `GET .../reservations`, `POST .../reservations`, `DELETE .../reservations/{rid}`
- Speed test: `POST .../speed-test`
- Diagnostics: `GET .../diagnostics`, `POST .../diagnostics`

## Network Details (user's setup)
- Network name: "Orange&Gray", ID: 6274130
- Gateway: eero Max 7 (Living Room, 192.168.86.1) — ~32 clients
- Extender: eero Pro 6E (Office, 192.168.86.250) — ~16 clients
- Subnet: 192.168.86.0/24
- Custom DNS: 192.168.86.5 (Pi-hole/AdGuard)
- ~60 total devices, ~48 online at any time
- No eero Plus subscription (activity/insights endpoints return 403)

## Type Checking
```bash
cd frontend && npx tsc --noEmit
```
