# Frontend (React + Vite)

This frontend serves the eero Dashboard UI and talks to the backend through `/api`.

## Local development

```bash
cd /tmp/workspace/xrvk/eero-dashboard/frontend
npm install
npm run dev
```

Dev server: `http://localhost:5173`  
API proxy target: `http://localhost:8420`

## Commands

- `npm run dev` — start local dev server
- `npm run lint` — run eslint
- `npm run typecheck` — run TypeScript checks
- `npm run build` — production build
- `npm run test -- --watch=false` — run tests once

## Structure

- `src/App.tsx` — top-level app/auth/network selection
- `src/features/app/*` — layout shell (sidebar + tab content)
- `src/components/*` — feature views and UI modules
- `src/api/client.ts` — shared request/error handling
- `src/api/devices.ts` — devices API module
- `src/api.ts` — compatibility API surface for existing imports
- `src/hooks/useFetch.ts` — fetch lifecycle/retry/cancel helper

## Conventions

- Prefer feature-specific API modules for new work.
- Keep `src/api.ts` as a compatibility export layer while incrementally splitting APIs.
- Add tests near behavior-rich UI components and mocked API boundaries.
