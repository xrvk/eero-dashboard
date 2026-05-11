# Copilot Instructions — eero Dashboard

## Project Overview
This is a React + TypeScript (Vite) frontend with a Python/FastAPI backend for managing eero mesh Wi-Fi networks. The app provides device management, network health monitoring, profile management, guest network controls, and network settings.

## Tech Stack
- **Frontend:** React 18, TypeScript, Vite, CSS (no preprocessor)
- **Backend:** Python 3, FastAPI, aiohttp
- **Testing:** Vitest + React Testing Library (frontend), pytest (backend)

## Design System
For all UI and styling decisions, follow the design system documented in `.github/copilot-design-instructions.md`. Key rules:
- Use CSS variables from `index.css` — never hardcode colors
- Use Unicode emoji for all icons — no icon libraries
- Follow the Canonical Emoji Dictionary for icon choices
- Test both dark and light themes
- Use established component patterns (cards, tables, toggles, buttons, empty states)

## Code Conventions
- Components live in `frontend/src/components/` (page-level views) and `frontend/src/features/` (feature modules)
- API calls go through `frontend/src/api/` or `frontend/src/api.ts`
- Backend routes are organized by feature in `backend/features/`
- Use `'SF Mono', monospace` for technical values (IPs, MACs, speeds)
- Keep components self-contained — styles in `App.css` / `index.css`
