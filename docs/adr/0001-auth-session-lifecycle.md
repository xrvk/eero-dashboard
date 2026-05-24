# ADR 0001: Single Shared eero Client/Session Lifecycle

## Status

**Accepted**

## Context

The backend needs a stable authenticated eero client across requests while still supporting logout/reset and clean shutdown behavior.

## Decision

Maintain one process-level `EeroClient` instance in `backend/core/client.py`, initialized via FastAPI lifespan and reused through dependency helpers.

## Consequences

- Auth state is centralized and simpler for API handlers.
- The session cookie is persisted to `backend/data/.eero_session` (inside the Docker volume), so logins survive container rebuilds.
- Logout/reset can explicitly clear cookies and rebuild client state.
- Future refactors should preserve this lifecycle unless migrating to per-user multi-session architecture.
