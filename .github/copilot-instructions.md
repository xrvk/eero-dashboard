# Copilot Instructions — eero Dashboard

## Project Overview
This is a React + TypeScript (Vite) frontend with a Python/FastAPI backend for managing eero mesh Wi-Fi networks. The app provides device management, network health monitoring, profile management, guest network controls, and network settings.

## Tech Stack
- **Frontend:** React 19, TypeScript 6, Vite 8, CSS (no preprocessor)
- **Backend:** Python 3, FastAPI, aiohttp
- **Testing:** Vitest + React Testing Library (frontend), pytest (backend)
- **Icons:** Lucide React for action icons, emoji for decorative/categorical icons

## Design System
For all UI and styling decisions, follow the design system documented in `.github/copilot-design-instructions.md`. Key rules:
- Use CSS variables from `index.css` — never hardcode colors
- Use Lucide React (`lucide-react`) for action button icons, emoji for decorative/categorical icons
- Follow the Canonical Emoji Dictionary for emoji icon choices
- Test both dark and light themes
- Use established component patterns (cards, tables, toggles, buttons, empty states)

## Code Conventions
- Components live in `frontend/src/components/` (page-level views) and `frontend/src/features/` (feature modules)
- Shared/reusable UI primitives live in `frontend/src/components/shared/` (CopyableValue, ErrorBoundary)
- API calls go through `frontend/src/api/` or `frontend/src/api.ts`
- Backend routes are organized by feature in `backend/features/`
- Backend eero-api internals wrapped in `backend/core/facade.py` — services import `facade`, never access `client._api` directly
- Cache keys use `cache.keys.*` methods — never hardcode f-string keys
- Use React Context (ThemeContext, AuthContext, NetworkContext) for shared state — avoid prop drilling
- Use `'JetBrains Mono', 'SF Mono', ui-monospace, monospace` for technical values (IPs, MACs, speeds)
- Keep components self-contained — styles in `App.css` / `index.css`

## CI / Validation
- **Validate workflow** (~35s): lint, build (includes typecheck), frontend tests, backend compile + smoke tests
- **Container Sanity** (~30s): Docker image build + `/api/health` startup check
- **Docker Build & Publish** (~3.5min): full image build + GHCR push (runs on main only)
- **Pre-commit hook**: runs `npm run quick-check` (lint + typecheck only, ~3s) for fast local feedback
- **Full validation**: `npm run validate` runs lint → build → test (frontend) + compile → test (backend)
- Agent merge CI polling interval should be **~2 minutes** — CI completes in under a minute typically
- Run `npm run validate` locally before pushing to avoid CI failures
- The `frontend` check is the required status check for PRs

## Architecture
- **React Contexts**: `ThemeContext`, `AuthContext`, `NetworkContext` in `features/app/` eliminate prop drilling from App.tsx
- **Shared UI**: Reusable components in `components/shared/` (CopyableValue, ErrorBoundary)
- **Error boundaries**: Each feature tab is wrapped in an ErrorBoundary for crash isolation
- **Backend facade**: `core/facade.py` wraps eero-api internals (`client._api.*`) — never access `_api` directly in services
- **Cache keys**: Always use `cache.keys.*` methods — never hardcode f-string cache keys
- **Upstream cache**: Every mutation must call `cache.clear_upstream()` after modifying state
