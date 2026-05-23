"""FastAPI middleware that serves canned demo responses when demo mode is on.

When ``EERO_DEMO_DATA=true``:
  * GET ``/api/*`` paths matching ``core.demo_data`` return synthetic JSON.
  * Mutation methods on ``/api/*`` return a no-op success body.
  * All other paths (e.g. ``/api/health``, static files, ``/openapi.json``)
    fall through to the normal app so real handlers still run.

The middleware is a no-op when demo mode is off.
"""

from __future__ import annotations

import logging
import re

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from core import demo_data
from core.demo import is_demo_mode

logger = logging.getLogger("eero.demo")

_MUTATION_METHODS = {"POST", "PUT", "PATCH", "DELETE"}
_DEVICE_RE = re.compile(rf"^/api/networks/{re.escape(demo_data.NETWORK_ID)}/devices/([^/]+)$")
_DEVICE_PRIORITY_RE = re.compile(rf"^/api/networks/{re.escape(demo_data.NETWORK_ID)}/devices/[^/]+/priority$")
_EERO_RE = re.compile(rf"^/api/networks/{re.escape(demo_data.NETWORK_ID)}/eeros/([^/]+)$")

# Paths that must always reach the real handler so operators / health probes
# can still see the truth about the running process.
_PASSTHROUGH_PATHS = {"/api/health"}


def _match_dynamic(path: str) -> dict | None:
    m = _DEVICE_PRIORITY_RE.match(path)
    if m:
        return {"prioritized": False, "duration_minutes": None}

    m = _DEVICE_RE.match(path)
    if m:
        dev = demo_data.lookup_device(m.group(1))
        return dev if dev is not None else demo_data.DEVICES[0]

    m = _EERO_RE.match(path)
    if m:
        eero = demo_data.lookup_eero(m.group(1))
        return eero if eero is not None else demo_data.EERO_NODES[0]

    return None


class DemoModeMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if not is_demo_mode():
            return await call_next(request)

        path = request.url.path
        if not path.startswith("/api/") or path in _PASSTHROUGH_PATHS:
            return await call_next(request)

        method = request.method.upper()

        if method in _MUTATION_METHODS:
            logger.info("DEMO: short-circuit %s %s", method, path)
            return JSONResponse({"status": "ok", "data": {}, "_demo": True})

        if method != "GET":
            return await call_next(request)

        static = demo_data.get_static_routes().get(path)
        if static is not None:
            return JSONResponse(static)

        dynamic = _match_dynamic(path)
        if dynamic is not None:
            return JSONResponse(dynamic)

        # Unknown /api/* GET — fall through so the real router can 404 or
        # serve it if a non-demo endpoint exists.
        return await call_next(request)
