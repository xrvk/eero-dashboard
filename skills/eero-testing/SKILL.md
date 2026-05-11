---
name: eero-testing
description: "Guide testing practices for the eero Dashboard. Use this skill when writing tests, debugging test failures, adding test coverage, or running the validation pipeline. Also use when deciding what to test, creating test factories, or setting up test infrastructure. Triggers: test, vitest, pytest, test factory, coverage, validate, CI, testing strategy, TDD, regression."
---

Guide testing practices for the eero Dashboard — Vitest + React Testing Library for frontend, pytest/unittest for backend.

## Testing Philosophy

Write tests for things that have bitten you, not for everything (80/20 rule):

| Layer | Priority | Why |
|---|---|---|
| Unit tests (core logic) | ✅ Always | Cheap, fast, highest value |
| Type checking (`tsc`) | ✅ Always | Catches tons of bugs for free |
| Build step (`vite build`) | ✅ Always | Free regression safety net |
| Component tests | 🟡 Sometimes | Only for complex interactive components |
| E2E tests | ❌ Skip early | Slow, brittle, overkill for solo dev |

When a bug appears: **write a test first**, then fix it. This grows a regression suite around the things that actually break.

## Commands

```bash
# Fast local feedback (pre-commit hook runs this)
npm run quick-check          # lint + typecheck only (~3s)

# Test suites
npm run test                 # frontend + backend tests
npm run test:watch           # vitest watch mode (fast feedback)
npm run test:frontend        # vitest run --watch=false
npm run test:backend         # python -m unittest discover

# Full validation (run before push/PR)
npm run validate             # lint → build → test (frontend) + compile → test (backend)
npm run validate:frontend    # lint + build + test
npm run validate:backend     # compileall + unittest
```

## Frontend Testing (Vitest + React Testing Library)

### Test File Location

Tests live alongside source files:
```
src/components/devices/DeviceList.test.tsx
src/hooks/useFetch.test.ts
src/api/devices.test.ts
```

### Test Factories

Use shared factories in `frontend/src/test/factories.ts` for mock data:

```typescript
import { buildDevice, buildNetwork, buildEeroNode, buildProfile } from '../test/factories';

const device = buildDevice({ display_name: 'iPhone', connected: true });
const network = buildNetwork({ name: 'Home' });
const node = buildEeroNode({ location: 'Living Room' });
const profile = buildProfile({ name: 'Kids' });
```

Factories provide sensible defaults with `Partial<T>` overrides. **Always use factories** instead of inline mock objects — they stay in sync with type changes.

### Component Test Pattern

```typescript
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

describe('MyComponent', () => {
  it('renders expected content', () => {
    render(<MyComponent data={buildDevice()} />);
    expect(screen.getByText('expected text')).toBeInTheDocument();
  });

  it('handles user interaction', async () => {
    const onAction = vi.fn();
    render(<MyComponent onAction={onAction} />);
    await userEvent.click(screen.getByRole('button', { name: /action/ }));
    expect(onAction).toHaveBeenCalled();
  });
});
```

### Mocking API Calls

```typescript
import * as api from '../api';

vi.mock('../api');
const mockGetDevices = vi.mocked(api.getDevices);
mockGetDevices.mockResolvedValue([buildDevice(), buildDevice()]);
```

### Testing with Contexts

When components depend on React Contexts (Theme, Auth, Network), wrap in providers:

```typescript
function renderWithProviders(ui: React.ReactElement) {
  return render(
    <ThemeProvider>
      <NetworkProvider>
        <AuthProvider>{ui}</AuthProvider>
      </NetworkProvider>
    </ThemeProvider>
  );
}
```

## Backend Testing (pytest / unittest)

### Test Location

```
backend/tests/test_api_smoke.py   # API endpoint smoke tests
backend/tests/test_*.py           # Additional test files
```

### Smoke Test Pattern

```python
import unittest

class TestApiSmoke(unittest.TestCase):
    def test_health_endpoint(self):
        # Test the health endpoint returns expected shape
        ...

    def test_cache_key_consistency(self):
        # Verify cache.keys.* methods return expected formats
        ...
```

### Backend Validation

```bash
# Compile check (catches syntax errors)
python -m compileall backend

# Run tests
python -m unittest discover -s backend/tests
```

## CI Pipeline

The CI runs automatically on PRs:

1. **Validate workflow** (~35s): lint → build (includes typecheck) → frontend tests → backend compile + smoke tests
2. **Container Sanity** (~30s): Docker image build + `/api/health` startup check
3. **Docker Build & Publish** (~3.5min): full image build + GHCR push (main only)

The `frontend` check is the **required status check** for PRs.

## Safe-Change Checklist

1. Touch the smallest scope possible
2. Keep endpoint paths and response shapes backward compatible
3. For frontend API edits, update both typed wrappers and consuming components/tests
4. Every `useFetch()` call must include a `cacheKey` matching the API path
5. After mutations, call `refetch()` to invalidate cached data
6. Run `npm run validate` before opening/updating PRs
7. If behavior changes, add or update tests in:
   - `backend/tests/test_api_smoke.py`
   - `frontend/src/**/*.test.tsx`

## When to Write Tests

- **Bug appears** → write a failing test first, then fix (regression test)
- **Complex logic** → unit test core business logic and utility functions
- **Interactive components** → test user interactions and state changes
- **API contracts** → smoke test endpoint responses
- **Type changes** → update test factories, then tests follow
