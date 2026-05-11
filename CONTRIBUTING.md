# Contributing

## Quick start

```bash
npm run bootstrap
```

## Local run

Backend:

```bash
cd backend
python main.py
```

Frontend:

```bash
cd frontend
npm run dev
```

## Validation workflows

From repo root:

- `npm run test` — frontend tests + backend smoke tests
- `npm run validate` — frontend lint/typecheck/build/test + backend compile/test
- `npm run test:watch` — vitest in watch mode for fast local feedback

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
4. Run `npm run validate` before opening/updating PRs.
5. If behavior changes, add or update tests in:
   - `backend/tests/test_api_smoke.py`
   - `frontend/src/**/*.test.tsx`

## Docs to update with behavior changes

- `README.md`
- `docs/API_REFERENCE.md`
- Relevant ADR in `docs/adr/`
