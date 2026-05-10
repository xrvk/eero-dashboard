import asyncio
import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from eero import EeroClient

COOKIE_FILE = str(Path(__file__).parent / ".eero_session")

# Module-level client reference
_client: EeroClient | None = None


def _make_client() -> EeroClient:
    return EeroClient(cookie_file=COOKIE_FILE, use_keyring=False)


async def get_client() -> EeroClient:
    """Return the authenticated EeroClient, or raise if not authenticated."""
    global _client
    if _client is None:
        _client = _make_client()
        await _client.__aenter__()
    if not _client.is_authenticated:
        raise HTTPException(status_code=401, detail="Not authenticated. Please login first.")
    return _client


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _client
    _client = _make_client()
    await _client.__aenter__()
    yield
    if _client:
        await _client.__aexit__(None, None, None)
        _client = None


app = FastAPI(title="eero Dashboard API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Auth ──────────────────────────────────────────────────────────────────────


class LoginRequest(BaseModel):
    email: str


class VerifyRequest(BaseModel):
    code: str


@app.get("/api/auth/status")
async def auth_status():
    global _client
    if _client is None:
        _client = _make_client()
        await _client.__aenter__()
    if _client.is_authenticated:
        try:
            account = await _client.get_account()
            return {
                "authenticated": True,
                "name": account.get("name", ""),
                "email": account.get("email", {}).get("value", ""),
            }
        except Exception:
            return {"authenticated": False}
    return {"authenticated": False}


@app.post("/api/auth/login")
async def login(req: LoginRequest):
    global _client
    if _client is None:
        _client = _make_client()
        await _client.__aenter__()
    try:
        await _client.login(req.email)
        return {"status": "verification_required", "message": "Check your email for a verification code."}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/auth/verify")
async def verify(req: VerifyRequest):
    global _client
    if _client is None:
        raise HTTPException(status_code=400, detail="No pending login. Call /api/auth/login first.")
    try:
        await _client.verify(req.code)
        return {"status": "authenticated"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/auth/logout")
async def logout():
    global _client
    if _client:
        try:
            await _client.logout()
        except Exception:
            pass
    # Remove cookie file
    cookie_path = Path(COOKIE_FILE)
    if cookie_path.exists():
        cookie_path.unlink()
    # Recreate a fresh client
    if _client:
        await _client.__aexit__(None, None, None)
    _client = _make_client()
    await _client.__aenter__()
    return {"status": "logged_out"}


# ── Network ───────────────────────────────────────────────────────────────────


@app.get("/api/networks")
async def list_networks():
    client = await get_client()
    try:
        resp = await client.get_networks()
        networks = resp.get("data", {}).get("networks", resp.get("networks", []))
        return {"networks": networks}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/networks/{network_id}")
async def get_network(network_id: str):
    client = await get_client()
    try:
        resp = await client.get_network(network_id)
        data = resp.get("data", resp)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Devices ───────────────────────────────────────────────────────────────────


@app.get("/api/networks/{network_id}/devices")
async def list_devices(network_id: str):
    client = await get_client()
    try:
        resp = await client.get_devices(network_id)
        devices = resp.get("data", resp.get("devices", []))
        if isinstance(devices, dict):
            devices = devices.get("devices", [])
        return {"devices": devices}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Eero Nodes ────────────────────────────────────────────────────────────────


@app.get("/api/networks/{network_id}/eeros")
async def list_eeros(network_id: str):
    client = await get_client()
    try:
        resp = await client.get_eeros(network_id)
        eeros = resp.get("data", resp.get("eeros", []))
        if isinstance(eeros, dict):
            eeros = eeros.get("eeros", [])
        return {"eeros": eeros}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Profiles ──────────────────────────────────────────────────────────────────


@app.get("/api/networks/{network_id}/profiles")
async def list_profiles(network_id: str):
    client = await get_client()
    try:
        resp = await client.get_profiles(network_id)
        profiles = resp.get("data", resp.get("profiles", []))
        if isinstance(profiles, dict):
            profiles = profiles.get("profiles", [])
        return {"profiles": profiles}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── DNS ───────────────────────────────────────────────────────────────────────


@app.get("/api/networks/{network_id}/dns")
async def get_dns(network_id: str):
    client = await get_client()
    try:
        resp = await client.get_dns_settings(network_id)
        return resp.get("data", resp)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Activity ──────────────────────────────────────────────────────────────────


@app.get("/api/networks/{network_id}/activity")
async def get_activity(network_id: str):
    client = await get_client()
    try:
        resp = await client.get_activity(network_id)
        return resp.get("data", resp)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8420, reload=True)
