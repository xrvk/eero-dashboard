import asyncio
import json
import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from eero import EeroClient

CREDENTIALS_FILE = Path(__file__).parent / ".eero_credentials"


class FileCredentialStore:
    """Simple file-based credential store for the eero session token."""

    def __init__(self, path: Path = CREDENTIALS_FILE):
        self.path = path

    def load(self) -> str | None:
        if self.path.exists():
            data = json.loads(self.path.read_text())
            return data.get("user_token")
        return None

    def save(self, user_token: str):
        self.path.write_text(json.dumps({"user_token": user_token}))

    def clear(self):
        if self.path.exists():
            self.path.unlink()


cred_store = FileCredentialStore()

# Module-level client reference
_client: EeroClient | None = None
_pending_login_token: str | None = None


async def get_client() -> EeroClient:
    """Return the authenticated EeroClient, or raise if not authenticated."""
    global _client
    if _client is None:
        token = cred_store.load()
        if token is None:
            raise HTTPException(status_code=401, detail="Not authenticated. Please login first.")
        _client = EeroClient(user_token=token)
    return _client


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _client
    token = cred_store.load()
    if token:
        _client = EeroClient(user_token=token)
    yield
    if _client:
        await _client.close()
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
    token = cred_store.load()
    if token and _client:
        try:
            resp = await _client.get_account()
            account = resp.get("data", {})
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
    global _pending_login_token
    try:
        temp_client = EeroClient()
        resp = await temp_client.login(req.email)
        _pending_login_token = resp.get("data", {}).get("user_token")
        await temp_client.close()
        return {"status": "verification_required", "message": "Check your email for a verification code."}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/auth/verify")
async def verify(req: VerifyRequest):
    global _client, _pending_login_token
    if not _pending_login_token:
        raise HTTPException(status_code=400, detail="No pending login. Call /api/auth/login first.")
    try:
        temp_client = EeroClient(user_token=_pending_login_token)
        resp = await temp_client.verify(req.code)
        user_token = resp.get("data", {}).get("user_token", _pending_login_token)
        cred_store.save(user_token)
        _client = EeroClient(user_token=user_token)
        _pending_login_token = None
        await temp_client.close()
        return {"status": "authenticated"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/auth/logout")
async def logout():
    global _client
    if _client:
        await _client.close()
        _client = None
    cred_store.clear()
    return {"status": "logged_out"}


# ── Network ───────────────────────────────────────────────────────────────────

def _extract_network_id(url: str) -> str:
    """Extract the numeric network ID from a URL like /2.2/networks/12345."""
    return url.strip("/").split("/")[-1]


@app.get("/api/networks")
async def list_networks():
    client = await get_client()
    try:
        resp = await client.get_networks()
        networks = resp.get("data", {}).get("networks", [])
        return {"networks": networks}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/networks/{network_id}")
async def get_network(network_id: str):
    client = await get_client()
    try:
        resp = await client.get_network(network_id)
        return resp.get("data", {})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Devices ───────────────────────────────────────────────────────────────────


@app.get("/api/networks/{network_id}/devices")
async def list_devices(network_id: str):
    client = await get_client()
    try:
        resp = await client.get_devices(network_id)
        devices = resp.get("data", [])
        return {"devices": devices}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Eero Nodes ────────────────────────────────────────────────────────────────


@app.get("/api/networks/{network_id}/eeros")
async def list_eeros(network_id: str):
    client = await get_client()
    try:
        resp = await client.get_eeros(network_id)
        eeros = resp.get("data", [])
        return {"eeros": eeros}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Profiles ──────────────────────────────────────────────────────────────────


@app.get("/api/networks/{network_id}/profiles")
async def list_profiles(network_id: str):
    client = await get_client()
    try:
        resp = await client.get_profiles(network_id)
        profiles = resp.get("data", [])
        return {"profiles": profiles}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── DNS ───────────────────────────────────────────────────────────────────────


@app.get("/api/networks/{network_id}/dns")
async def get_dns(network_id: str):
    client = await get_client()
    try:
        resp = await client.get_dns(network_id)
        return resp.get("data", {})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Activity ──────────────────────────────────────────────────────────────────


@app.get("/api/networks/{network_id}/activity")
async def get_activity(network_id: str):
    client = await get_client()
    try:
        resp = await client.get_activity(network_id)
        return resp.get("data", {})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8420, reload=True)
