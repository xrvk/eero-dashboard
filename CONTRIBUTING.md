# Contributing

Thanks for your interest in contributing to eero Dashboard! Whether you're fixing a bug, adding a feature, or improving docs — all contributions are welcome.

## Table of contents

- [Getting help](#getting-help)
- [How to contribute](#how-to-contribute)
- [Development setup](#development-setup)
- [Development workflow](#development-workflow)
- [Code guidelines](#code-guidelines)
- [Architecture map](#architecture-map)

---

## Getting help

| Channel | Use for |
|---------|---------|
| [GitHub Issues](https://github.com/xrvk/eero-dashboard/issues) | Bug reports, feature requests |
| [GitHub Discussions](https://github.com/xrvk/eero-dashboard/discussions) | Questions, ideas, show & tell |

Before opening an issue, please:
1. Search existing issues to avoid duplicates
2. Check the [documentation](./docs/html/installation.html) for setup/config questions
3. Use the appropriate issue template (bug report or feature request)

---

## How to contribute

### Reporting bugs

Use the [bug report template](https://github.com/xrvk/eero-dashboard/issues/new?template=bug_report.yml). Include:
- Steps to reproduce
- Expected vs actual behavior
- Deployment method and browser info
- Relevant logs or screenshots

### Suggesting features

Use the [feature request template](https://github.com/xrvk/eero-dashboard/issues/new?template=feature_request.yml). Explain:
- The problem you're trying to solve
- Your proposed solution
- Any alternatives you've considered

### Submitting code

1. Fork the repo and create a branch off `main`
2. Make your changes (see [code guidelines](#code-guidelines) below)
3. Run `npm run validate` to ensure everything passes
4. Open a pull request — fill out the PR template
5. Respond to review feedback

**First time?** Look for issues labeled [`good first issue`](https://github.com/xrvk/eero-dashboard/labels/good%20first%20issue).

---

## Development setup

### Prerequisites

- Node.js 20+
- Python 3.12+
- Docker (optional, for container testing)

### Quick start

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

- `npm run quick-check` — lint + typecheck only (~3s, used by pre-commit hook)
- `npm run test` — frontend tests + backend smoke tests
- `npm run validate` — frontend lint/build/test + backend compile/test
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

The Husky pre-commit hook runs `npm run quick-check` (lint + typecheck, ~3s) for fast feedback. Full validation happens in CI. To skip for WIP commits:

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

### Test factories

Use shared factories in `frontend/src/test/factories.ts` to build mock data:

```typescript
import { buildDevice, buildNetwork } from '../test/factories';

const device = buildDevice({ display_name: 'iPhone', connected: true });
const network = buildNetwork({ name: 'Home' });
```

Factories provide sensible defaults with `Partial<T>` overrides. Available: `buildNetwork`, `buildDevice`, `buildEeroNode`, `buildProfile`.

## Dry-run mode (safe mutation testing)

Enable dry-run mode to test mutation endpoints without hitting the live eero API:

```bash
# In backend/.env (or export in your shell)
EERO_DRY_RUN=true
```

Confirm it's active via the health endpoint:
```bash
curl http://localhost:8420/api/health | jq .dry_run
# → true
```

### What gets mocked vs blocked

| Status | Endpoints | Why |
|--------|-----------|-----|
| ✅ Mocked | `set_network_name`, `set_guest_network`, `configure_security`, `set_sqm_enabled`, `configure_sqm`, `set_sqm_auto`, `set_dns_caching`, `set_dns_mode`, `pause_device` | Response shape verified — uses `_put_settings` or known REST patterns |
| ⚠️ Blocked (403) | `reboot_network`, `run_diagnostics`, `run_speed_test`, `pause_profile`, `block_device`, `set_device_nickname`, `set_device_priority`, `set_blocked_apps`, `set_bedtime`, `set_schedule`, `clear_schedule`, `set_profile_devices`, `add_to_blacklist`, `remove_from_blacklist`, `create/delete_forward`, `create/delete_reservation`, `create/rename/delete_profile` | Uses eero-api library internals — response shape not verified |

Mocked endpoints return `{"data": {...payload, "_dry_run": true}}` and log what would have been sent.
Blocked endpoints return a 403 with a clear message explaining the limitation.

**Production safety:** `EERO_DRY_RUN` defaults to `false`. Never set it in production.

## Architecture map

- `backend/main.py` — app wiring, speed-history flow, and remaining core endpoints
- `backend/core/facade.py` — facade wrapping eero-api internals (never access `client._api` directly)
- `backend/core/cache.py` — in-memory TTL cache with `keys` class for centralized key generators
- `backend/features/auth` — auth routes/services/schemas
- `backend/features/devices` — devices routes/services/schemas
- `backend/features/networks` — network read routes/services
- `backend/features/network_ops` — prefetch, dns, activity, diagnostics routes/services
- `backend/features/profiles` — profile CRUD, pause, bedtime, schedule, content filter routes/services
- `frontend/src/features/app` — shell/sidebar/content tabs, ThemeContext, AuthContext, NetworkContext
- `frontend/src/components` — domain UI modules
- `frontend/src/components/shared` — reusable UI primitives (CopyableValue, ErrorBoundary)
- `frontend/src/api/*` — API client + typed endpoint wrappers
- `frontend/src/test/factories.ts` — shared test data builders

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
- `docs/html/installation.html`
- `docs/html/configuration.html`
- `docs/html/api-reference.html`
- `docs/html/architecture/` (backend, frontend, data-flow)
- Relevant ADR in `docs/html/adr/`
