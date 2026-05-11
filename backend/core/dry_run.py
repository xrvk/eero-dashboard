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
            logger.warning("🧪 DRY-RUN MODE ACTIVE — mutations will be mocked, not sent to eero")
        else:
            logger.info("Dry-run mode: off (live API)")
    return _DRY_RUN


def mock_settings_response(network_id: str, payload: dict) -> dict:
    """Return a mock response for _put_settings (PUT /networks/{id}/settings).

    The real eero API echoes the updated settings back inside a {"data": ...} wrapper.
    """
    logger.info(
        "DRY-RUN: would PUT /networks/%s/settings with %s", network_id, payload
    )
    return {"data": {**payload, "_dry_run": True}}


def mock_endpoint_response(
    method: str, path: str, payload: dict | None = None,
) -> dict:
    """Return a mock response for known non-settings mutation endpoints.

    Used for guest network, pause device, and other endpoints with verified
    response shapes.
    """
    logger.info(
        "DRY-RUN: would %s /%s with %s", method, path, payload or {}
    )
    return {"data": {**(payload or {}), "_dry_run": True}}


def block_unmocked_mutation(operation: str) -> None:
    """Raise an error for mutations we can't safely mock.

    These use eero-api library internals where the response shape
    hasn't been verified.
    """
    from fastapi import HTTPException

    logger.warning("DRY-RUN: blocked unmocked mutation: %s", operation)
    raise HTTPException(
        status_code=403,
        detail={
            "code": "dry_run_blocked",
            "message": (
                f"'{operation}' is not available in dry-run mode. "
                "This mutation uses eero-api library internals where the response "
                "shape hasn't been verified. Disable EERO_DRY_RUN to use this endpoint."
            ),
        },
    )
