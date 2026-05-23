from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from core.client import is_authenticated, lifespan
from core.demo import is_demo_mode
from core.demo_middleware import DemoModeMiddleware
from core.dry_run import is_dry_run
from core.errors import api_error_response
from features.auth.router import router as auth_router
from features.devices.router import router as devices_router
from features.eero_nodes.router import router as eero_nodes_router
from features.network_ops.router import router as network_ops_router
from features.network_settings.router import router as network_settings_router
from features.networks.router import router as networks_router
from features.port_forwards.router import router as port_forwards_router
from features.profiles.router import router as profiles_router
from features.security.router import router as security_router
from features.speed_test.router import router as speed_test_router

DATA_DIR = Path(__file__).parent / "data"

app = FastAPI(title="eero Dashboard API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(DemoModeMiddleware)
app.include_router(auth_router)
app.include_router(devices_router)
app.include_router(eero_nodes_router)
app.include_router(network_ops_router)
app.include_router(network_settings_router)
app.include_router(networks_router)
app.include_router(port_forwards_router)
app.include_router(profiles_router)
app.include_router(security_router)
app.include_router(speed_test_router)


@app.exception_handler(HTTPException)
async def http_exception_handler(_: Request, exc: HTTPException):
    detail = exc.detail
    code = "http_error"
    message = "Request failed"
    if isinstance(detail, dict):
        code = str(detail.get("code", code))
        message = str(detail.get("message", detail.get("detail", message)))
    elif isinstance(detail, str):
        message = detail

    return JSONResponse(
        status_code=exc.status_code,
        content=api_error_response(
            status_code=exc.status_code,
            code=code,
            message=message,
            detail=detail,
        ),
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(_: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content=api_error_response(
            status_code=500,
            code="internal_server_error",
            message="Internal server error",
            detail=str(exc),
        ),
    )


@app.get("/api/health")
async def health():
    authenticated = is_authenticated()
    data_dir_ok = DATA_DIR.exists()
    return {
        "status": "ok" if data_dir_ok else "degraded",
        "version": "1.0.0",
        "authenticated": authenticated,
        "data_dir": data_dir_ok,
        "dry_run": is_dry_run(),
        "demo_mode": is_demo_mode(),
    }


# ── Static Files (production / Docker mode) ──────────────────────────────────

STATIC_DIR = Path(__file__).parent / "static"
if STATIC_DIR.exists():
    app.mount("/", StaticFiles(directory=str(STATIC_DIR), html=True), name="static")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8420, reload=True)
