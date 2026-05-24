# Configuration

## Environment Variables

| Variable | Default | Description |
|----|----|----|
| `EERO_DRY_RUN` | `false` | Enable dry-run mode — blocks all mutations (POST/PUT/DELETE) with 403. See [Dry-Run Mode](dry-run-mode.md). |
| `SPEED_HISTORY_DAYS` | `365` | Number of days to retain speed test history. Set to `0` to keep all results. |
| `SPEED_TEST_POLL_INTERVAL` | `10` | Seconds between speed test status polls. |
| `SPEED_TEST_TIMEOUT` | `120` | Max seconds to wait for a speed test to complete. |

Set variables in `docker-compose.yml` under `environment`, or export them in your shell for local development:

```bash
export SPEED_HISTORY_DAYS=90
```

## Cache Behavior

- The backend uses an in-memory TTL cache (5-minute default) for API reads. See [Data Flow & Caching](architecture/data-flow.md) for details.
- `/api/prefetch/{network_id}` warms upstream eero API paths in parallel for faster subsequent reads.
- Speed test history is persisted to `data/speed_history.json` (inside the data volume) and pruned using `SPEED_HISTORY_DAYS`.
- The eero session cookie is persisted to `data/.eero_session` so logins survive container rebuilds.
- There is no automatic invalidation layer beyond upstream freshness and speed-history retention pruning.
