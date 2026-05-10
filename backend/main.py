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


class DnsModeRequest(BaseModel):
    mode: str
    custom_servers: list[str] | None = None


class DnsCachingRequest(BaseModel):
    enabled: bool


@app.post("/api/networks/{network_id}/dns/mode")
async def set_dns_mode(network_id: str, req: DnsModeRequest):
    client = await get_client()
    try:
        resp = await client.set_dns_mode(req.mode, custom_servers=req.custom_servers, network_id=network_id)
        return resp.get("data", resp)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/networks/{network_id}/dns/caching")
async def set_dns_caching(network_id: str, req: DnsCachingRequest):
    client = await get_client()
    try:
        resp = await client.set_dns_caching(req.enabled, network_id=network_id)
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


@app.get("/api/networks/{network_id}/activity/history")
async def get_activity_history(network_id: str, period: str = "day"):
    client = await get_client()
    try:
        resp = await client.get_activity_history(network_id, period=period)
        return resp.get("data", resp)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/networks/{network_id}/activity/clients")
async def get_activity_clients(network_id: str):
    client = await get_client()
    try:
        resp = await client.get_activity_clients(network_id)
        return resp.get("data", resp)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/networks/{network_id}/activity/categories")
async def get_activity_categories(network_id: str):
    client = await get_client()
    try:
        resp = await client.get_activity_categories(network_id)
        return resp.get("data", resp)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Speed Test ────────────────────────────────────────────────────────────────


@app.post("/api/networks/{network_id}/speed-test")
async def run_speed_test(network_id: str):
    client = await get_client()
    try:
        resp = await client.run_speed_test(network_id)
        return resp.get("data", resp)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Diagnostics ───────────────────────────────────────────────────────────────


@app.get("/api/networks/{network_id}/diagnostics")
async def get_diagnostics(network_id: str):
    client = await get_client()
    try:
        resp = await client.get_diagnostics(network_id)
        return resp.get("data", resp)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/networks/{network_id}/diagnostics")
async def run_diagnostics(network_id: str):
    client = await get_client()
    try:
        resp = await client.run_diagnostics(network_id)
        return resp.get("data", resp)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Device Actions ────────────────────────────────────────────────────────────


class DevicePauseRequest(BaseModel):
    paused: bool


class DeviceBlockRequest(BaseModel):
    blocked: bool


@app.post("/api/networks/{network_id}/devices/{device_id}/pause")
async def pause_device(network_id: str, device_id: str, req: DevicePauseRequest):
    client = await get_client()
    try:
        resp = await client.pause_device(device_id, req.paused, network_id=network_id)
        return resp.get("data", resp)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/networks/{network_id}/devices/{device_id}/block")
async def block_device(network_id: str, device_id: str, req: DeviceBlockRequest):
    client = await get_client()
    try:
        resp = await client.block_device(device_id, req.blocked, network_id=network_id)
        return resp.get("data", resp)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Profile Actions ───────────────────────────────────────────────────────────


class ProfilePauseRequest(BaseModel):
    paused: bool


class BedtimeRequest(BaseModel):
    start_time: str
    end_time: str
    days: list[str] | None = None


class BlockedAppsRequest(BaseModel):
    applications: list[str]


@app.post("/api/networks/{network_id}/profiles/{profile_id}/pause")
async def pause_profile(network_id: str, profile_id: str, req: ProfilePauseRequest):
    client = await get_client()
    try:
        resp = await client.pause_profile(profile_id, req.paused, network_id=network_id)
        return resp.get("data", resp)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/networks/{network_id}/profiles/{profile_id}/bedtime")
async def set_bedtime(network_id: str, profile_id: str, req: BedtimeRequest):
    client = await get_client()
    try:
        resp = await client.enable_bedtime(
            profile_id, req.start_time, req.end_time, days=req.days, network_id=network_id
        )
        return resp.get("data", resp)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/networks/{network_id}/profiles/{profile_id}/blocked-apps")
async def get_blocked_apps(network_id: str, profile_id: str):
    client = await get_client()
    try:
        resp = await client.get_blocked_applications(profile_id, network_id=network_id)
        return resp.get("data", resp)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/networks/{network_id}/profiles/{profile_id}/blocked-apps")
async def set_blocked_apps(network_id: str, profile_id: str, req: BlockedAppsRequest):
    client = await get_client()
    try:
        resp = await client.set_blocked_applications(profile_id, req.applications, network_id=network_id)
        return resp.get("data", resp)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/networks/{network_id}/profiles/{profile_id}/schedule")
async def get_profile_schedule(network_id: str, profile_id: str):
    client = await get_client()
    try:
        resp = await client.get_profile_schedule(profile_id, network_id=network_id)
        return resp.get("data", resp)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class ProfileDevicesRequest(BaseModel):
    device_urls: list[str]


@app.put("/api/networks/{network_id}/profiles/{profile_id}/devices")
async def set_profile_devices(network_id: str, profile_id: str, req: ProfileDevicesRequest):
    client = await get_client()
    try:
        resp = await client.set_profile_devices(profile_id, req.device_urls, network_id=network_id)
        return resp.get("data", resp)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Security Settings ────────────────────────────────────────────────────────


@app.get("/api/networks/{network_id}/security")
async def get_security(network_id: str):
    client = await get_client()
    try:
        resp = await client.get_security_settings(network_id)
        return resp.get("data", resp)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class SecurityUpdateRequest(BaseModel):
    wpa3: bool | None = None
    band_steering: bool | None = None
    upnp: bool | None = None
    ipv6: bool | None = None
    thread: bool | None = None


@app.patch("/api/networks/{network_id}/security")
async def update_security(network_id: str, req: SecurityUpdateRequest):
    client = await get_client()
    try:
        kwargs: dict = {}
        if req.wpa3 is not None:
            kwargs["wpa3"] = req.wpa3
        if req.band_steering is not None:
            kwargs["band_steering"] = req.band_steering
        if req.upnp is not None:
            kwargs["upnp"] = req.upnp
        if req.ipv6 is not None:
            kwargs["ipv6"] = req.ipv6
        if req.thread is not None:
            kwargs["thread"] = req.thread
        resp = await client.configure_security(network_id=network_id, **kwargs)
        return resp.get("data", resp)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Port Forwarding & Reservations ───────────────────────────────────────────


@app.get("/api/networks/{network_id}/forwards")
async def get_forwards(network_id: str):
    client = await get_client()
    try:
        resp = await client.get_forwards(network_id)
        return resp.get("data", resp)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/networks/{network_id}/reservations")
async def get_reservations(network_id: str):
    client = await get_client()
    try:
        resp = await client.get_reservations(network_id)
        return resp.get("data", resp)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class CreateForwardRequest(BaseModel):
    ip: str
    gateway_port: int
    client_port: int
    protocol: str = "tcp"
    description: str = ""
    enabled: bool = True


@app.post("/api/networks/{network_id}/forwards")
async def create_forward(network_id: str, req: CreateForwardRequest):
    client = await get_client()
    try:
        resp = await client._api.forwards.create_forward(network_id, {
            "ip": req.ip,
            "gateway_port": req.gateway_port,
            "client_port": req.client_port,
            "protocol": req.protocol,
            "description": req.description,
            "enabled": req.enabled,
        })
        return resp.get("data", resp)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/networks/{network_id}/forwards/{forward_id}")
async def delete_forward(network_id: str, forward_id: str):
    client = await get_client()
    try:
        resp = await client._api.forwards.delete_forward(network_id, forward_id)
        return resp.get("data", resp)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class CreateReservationRequest(BaseModel):
    ip: str
    mac: str
    description: str = ""


@app.post("/api/networks/{network_id}/reservations")
async def create_reservation(network_id: str, req: CreateReservationRequest):
    client = await get_client()
    try:
        resp = await client._api.reservations.create_reservation(network_id, {
            "ip": req.ip,
            "mac": req.mac,
            "description": req.description,
        })
        return resp.get("data", resp)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/networks/{network_id}/reservations/{reservation_id}")
async def delete_reservation(network_id: str, reservation_id: str):
    client = await get_client()
    try:
        resp = await client._api.reservations.delete_reservation(network_id, reservation_id)
        return resp.get("data", resp)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Reboot Node ──────────────────────────────────────────────────────────────


@app.post("/api/networks/{network_id}/eeros/{eero_id}/reboot")
async def reboot_eero(network_id: str, eero_id: str):
    client = await get_client()
    try:
        resp = await client.reboot_eero(eero_id, network_id=network_id)
        return resp.get("data", resp)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8420, reload=True)
