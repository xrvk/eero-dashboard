# ADR 0002: Persist Speed History on Local JSON Storage

## Status

**Accepted**

## Context

Speed test history must survive backend restarts and container restarts without introducing a full database dependency.

## Decision

Persist speed results in `backend/data/speed_history.json` and prune entries by `SPEED_HISTORY_DAYS`.

## Consequences

- Deployment remains simple (file-backed persistence).
- Data retention is deterministic and configurable by environment variable.
- Concurrent write concerns remain low for current single-process runtime, but should be revisited if multi-worker writes are introduced.
