# Contributing

## Quick start

```bash
npm run bootstrap
```

## Local run

Backend:

```bash
cd backend
../.venv/bin/python main.py
# or: source .venv/bin/activate && python main.py
```

Frontend:

```bash
cd frontend
npm run dev
```

## Validation & release checklist

From repo root:

- `npm run test` — frontend tests + backend smoke tests
- `npm run validate` — frontend lint/typecheck/build/test + backend compile/test
- `npm run test:watch` — vitest in watch mode for fast local feedback

Before release:

- Backend: `python -m compileall backend` and `python -m unittest discover -s backend/tests`
- Frontend: `cd frontend && npm run lint && npm run typecheck && npm run build && npm run test`
- Container sanity: ensure `.github/workflows/container-sanity.yml` passes (image build + `/api/health` startup check)
- Manual: verify login/session, device actions, and key settings updates in a running build

## Development workflow

### Watch mode

While coding, run tests in watch mode for instant feedback:

```bash
npm run test:watch
```

### Pre-commit

The Husky pre-commit hook runs `npm run validate` automatically. To skip for WIP commits:

```bash
git commit --no-verify -m "wip"
```

### Branching & merging

```
main (always deployable)
 └── feature-branch (commit often, stay messy)
     → squash-merge back → delete branch
```

- Branch off `main`, merge back fast — avoid long-lived branches that drift
- Use squash-merge so `main` stays clean with one commit per logical change
- Use `git diff --stat` before merging as a quick self-review

### Tagging milestones

Tag known-good states so you can jump back:

```bash
git tag v0.1-auth-working
git tag v0.2-dashboard-mvp
```

### Testing philosophy

Write tests for things that have bitten you, not for everything.

| Layer | Priority | Why |
|---|---|---|
| Unit tests (core logic) | ✅ Always | Cheap, fast, highest value |
| Type checking (`tsc`) | ✅ Always | Catches tons of bugs for free |
| Build step (`vite build`) | ✅ Always | Free regression safety net |
| Component tests | 🟡 Sometimes | Only for complex interactive components |
| E2E tests | ❌ Skip early | Slow, brittle, overkill for solo dev |

When a bug appears: write a test first, then fix it. This grows a regression suite around the things that actually break.

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
4. **Every `useFetch()` call must include a `cacheKey`** matching the API path — see `.github/copilot-instructions.md` for the full pattern. This ensures prefetch warm-up and cross-mount caching work correctly.
5. After mutations, call `refetch()` to invalidate cached data.
6. Run `npm run validate` before opening/updating PRs.
7. If behavior changes, add or update tests in:
   - `backend/tests/test_api_smoke.py`
   - `frontend/src/**/*.test.tsx`

## Docs to update with behavior changes

- `README.md`
- `docs/installation.md`
- `docs/configuration.md`
- `docs/API_REFERENCE.md`
- `docs/architecture/` (backend, frontend, data-flow)
- Relevant ADR in `docs/adr/`
