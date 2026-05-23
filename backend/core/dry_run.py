"""Dry-run mode for safe mutation testing without hitting the eero cloud API.

Enable with EERO_DRY_RUN=true in the environment (or .env file).
Always defaults to off — must be explicitly enabled for local testing.
"""

import logging
import os
from typing import Any

logger = logging.getLogger("eero.dry_run")

_DRY_RUN: bool | None = None


def is_dry_run() -> bool:
    """Check whether dry-run mode is active."""
    global _DRY_RUN
    if _DRY_RUN is None:
        _DRY_RUN = os.environ.get("EERO_DRY_RUN", "false").lower() in ("true", "1", "yes")
        if _DRY_RUN:
            logger.warning("🧪 DRY-RUN MODE ACTIVE — mutations will be blocked with HTTP 403")
        else:
            logger.info("Dry-run mode: off (live API)")
    return _DRY_RUN


def block_unmocked_mutation(operation: str) -> None:
    """Block a mutation in dry-run mode by raising HTTP 403.

    All mutations follow this path — dry-run mode never returns synthetic
    success responses, so no live eero state can change while it's active.
    """
    from fastapi import HTTPException

    logger.warning("DRY-RUN: blocked mutation: %s", operation)
    raise HTTPException(
        status_code=403,
        detail={
            "code": "dry_run_blocked",
            "message": (
                f"'{operation}' is blocked in dry-run mode. "
                "Disable EERO_DRY_RUN to use this endpoint."
            ),
        },
    )
