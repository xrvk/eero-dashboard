"""Demo-mode flag.

Enable with ``EERO_DEMO_DATA=true`` in the environment (or ``.env``). When on,
the backend short-circuits authentication and serves canned demo data for
read endpoints (see ``core.demo_middleware``). Mutations return a no-op
success response — no eero cloud calls are made.

Always defaults to off. Restart required to toggle.
"""

import logging
import os

logger = logging.getLogger("eero.demo")

_DEMO_MODE: bool | None = None


def is_demo_mode() -> bool:
    """Check whether demo mode is active."""
    global _DEMO_MODE
    if _DEMO_MODE is None:
        _DEMO_MODE = os.environ.get("EERO_DEMO_DATA", "false").lower() in (
            "true",
            "1",
            "yes",
        )
        if _DEMO_MODE:
            logger.warning(
                "🎭 DEMO MODE ACTIVE — auth is bypassed and all data is synthetic. "
                "Do not enable in production."
            )
        else:
            logger.info("Demo mode: off (live eero API)")
    return _DEMO_MODE


def reset_for_tests() -> None:
    """Clear cached flag — test helper only."""
    global _DEMO_MODE
    _DEMO_MODE = None
