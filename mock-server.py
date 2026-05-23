"""DEPRECATED: standalone mock-server has been folded into the real backend.

Run the real backend with the demo flag instead — auth is bypassed and the
same canned data is served via the FastAPI app:

    EERO_DEMO_DATA=true python3 backend/main.py

See docs/demo-data-mode.md for details.

This shim is kept so existing invocations of `python3 mock-server.py` fail
loudly rather than mysteriously.
"""

import sys

MESSAGE = (
    "\n"
    "mock-server.py has been removed.\n"
    "Run the real backend in demo mode instead:\n"
    "\n"
    "    EERO_DEMO_DATA=true python3 backend/main.py\n"
    "\n"
    "See docs/demo-data-mode.md.\n"
)


if __name__ == "__main__":
    sys.stderr.write(MESSAGE)
    sys.exit(2)
