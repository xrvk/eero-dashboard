# Contributing

## Quick start

```bash
cd /tmp/workspace/xrvk/eero-dashboard
npm run bootstrap
```

## Local run

Backend:

```bash
cd /tmp/workspace/xrvk/eero-dashboard/backend
python main.py
```

Frontend:

```bash
cd /tmp/workspace/xrvk/eero-dashboard/frontend
npm run dev
```

## Validation workflows

From repo root:

- `npm run test` — frontend tests + backend smoke tests
- `npm run validate` — frontend lint/typecheck/build/test + backend compile/test

## Architecture map

- `backend/main.py` — app wiring, speed-history flow, and remaining core endpoints
- `backend/features/auth` — auth routes/services/schemas
- `backend/features/devices` — devices routes/services/schemas
- `backend/features/networks` — network read routes/services
- `backend/features/network_ops` — prefetch, dns, activity, diagnostics routes/services
- `frontend/src/features/app` — shell/sidebar/content tabs
- `frontend/src/components` — domain UI modules
- `frontend/src/api/*` — API client + typed endpoint wrappers

## Safe-change checklist

1. Touch the smallest scope possible (feature folder first, avoid broad edits in `backend/main.py` unless needed).
2. Keep endpoint paths and response shape backward compatible unless explicitly changing contracts.
3. For frontend API edits, update both typed wrappers and consuming components/tests.
4. Run `npm run validate` before opening/updating PRs.
5. If behavior changes, add or update tests in:
   - `backend/tests/test_api_smoke.py`
   - `frontend/src/**/*.test.tsx`

## Docs to update with behavior changes

- `/tmp/workspace/xrvk/eero-dashboard/README.md`
- `/tmp/workspace/xrvk/eero-dashboard/docs/API_REFERENCE.md`
- Relevant ADR in `/tmp/workspace/xrvk/eero-dashboard/docs/adr/`
