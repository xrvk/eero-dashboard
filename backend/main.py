import asyncio
import json
import os
import re
import time
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Callable, Coroutine

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from eero import EeroClient

COOKIE_FILE = str(Path(__file__).parent / ".eero_session")
DATA_DIR = Path(__file__).parent / "data"
SPEED_HISTORY_FILE = DATA_DIR / "speed_history.json"
SPEED_HISTORY_DAYS = int(os.environ.get("SPEED_HISTORY_DAYS", "365"))
CACHE_TTL = int(os.environ.get("CACHE_TTL", "300"))
SPEED_TEST_POLL_INTERVAL = int(os.environ.get("SPEED_TEST_POLL_INTERVAL", "10"))
SPEED_TEST_TIMEOUT = int(os.environ.get("SPEED_TEST_TIMEOUT", "120"))

# Module-level client reference
_client: EeroClient | None = None

# ── In-memory cache ───────────────────────────────────────────────────────────

_cache: dict[str, tuple[float, Any]] = {}


def _cache_get(key: str) -> Any | None:
    entry = _cache.get(key)
    if entry and (time.monotonic() - entry[0]) < CACHE_TTL:
        return entry[1]
    return None


def _cache_set(key: str, value: Any) -> None:
    _cache[key] = (time.monotonic(), value)


def _cache_bust(prefix: str = "") -> None:
    """Clear cache entries matching prefix, or all if empty."""
    if not prefix:
        _cache.clear()
    else:
        for k in [k for k in _cache if k.startswith(prefix)]:
            del _cache[k]


async def _cached(key: str, fn: Callable[[], Coroutine[Any, Any, Any]]) -> Any:
    """Return cached result or call fn, cache it, and return."""
    hit = _cache_get(key)
    if hit is not None:
        return hit
    result = await fn()
    _cache_set(key, result)
    return result


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


# ── Health ────────────────────────────────────────────────────────────────────


@app.get("/api/health")
async def health():
    global _client
    authenticated = _client is not None and _client.is_authenticated
    data_dir_ok = DATA_DIR.exists()
    return {
        "status": "ok" if data_dir_ok else "degraded",
        "version": "1.0.0",
        "authenticated": authenticated,
        "data_dir": data_dir_ok,
    }


# ── Auth ──────────────────────────────────────────────────────────────────────


class LoginRequest(BaseModel):
    identifier: str


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
        await _client.login(req.identifier)
        is_phone = bool(re.match(r'^[\+\d\s\-\(\)]+$', req.identifier.strip()))
        channel = "phone" if is_phone else "email"
        return {"status": "verification_required", "message": f"Check your {channel} for a verification code."}
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


# ── Prefetch ─────────────────────────────────────────────────────────────────


@app.post("/api/prefetch/{network_id}")
async def prefetch(network_id: str):
    """Warm the cache by fetching all main data in parallel."""
    client = await get_client()
    try:
        results = await asyncio.gather(
            client.get_network(network_id),
            client.get_devices(network_id),
            client.get_eeros(network_id),
            client.get_profiles(network_id),
            client.get_dns_settings(network_id),
            client.get_security_settings(network_id),
            client.get_updates(network_id=network_id),
            client.get_thread(network_id=network_id),
            client.get_blacklist(network_id=network_id),
            return_exceptions=True,
        )
        ok = sum(1 for r in results if not isinstance(r, Exception))
        return {"status": "ok", "cached": ok, "total": len(results)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


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


def _save_speed_result(network_id: str, result: dict) -> None:
    """Append a speed test result and prune old entries."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    history: list = []
    if SPEED_HISTORY_FILE.exists():
        try:
            history = json.loads(SPEED_HISTORY_FILE.read_text())
        except (json.JSONDecodeError, OSError):
            history = []

    up_data = result.get("up", result.get("speed", {}).get("up", {}))
    down_data = result.get("down", result.get("speed", {}).get("down", {}))
    entry = {
        "network_id": network_id,
        "date": result.get("date", datetime.now(timezone.utc).isoformat()),
        "up": up_data.get("value") if isinstance(up_data, dict) else up_data,
        "down": down_data.get("value") if isinstance(down_data, dict) else down_data,
    }
    history.append(entry)

    cutoff = datetime.now(timezone.utc) - timedelta(days=SPEED_HISTORY_DAYS)
    history = [
        h for h in history
        if datetime.fromisoformat(h["date"].replace("Z", "+00:00")) > cutoff
    ]

    SPEED_HISTORY_FILE.write_text(json.dumps(history, indent=2))


@app.post("/api/networks/{network_id}/speed-test")
async def run_speed_test(network_id: str):
    client = await get_client()
    try:
        # Snapshot the current speed date so we can detect when it changes
        pre_resp = await client.get_network(network_id, refresh_cache=True)
        pre_data = pre_resp.get("data", pre_resp)
        pre_speed = pre_data.get("speed", {})
        pre_date = pre_speed.get("date") if isinstance(pre_speed, dict) else None

        # Kick off the speed test (returns 202 accepted)
        await client.run_speed_test(network_id)

        # Poll until the speed date changes or we time out
        deadline = time.monotonic() + SPEED_TEST_TIMEOUT
        while time.monotonic() < deadline:
            await asyncio.sleep(SPEED_TEST_POLL_INTERVAL)
            poll_resp = await client.get_network(network_id, refresh_cache=True)
            poll_data = poll_resp.get("data", poll_resp)
            poll_speed = poll_data.get("speed", {})
            poll_date = poll_speed.get("date") if isinstance(poll_speed, dict) else None

            if poll_date and poll_date != pre_date:
                _save_speed_result(network_id, poll_speed)
                return poll_speed

        raise HTTPException(
            status_code=504,
            detail="Speed test timed out waiting for results",
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/networks/{network_id}/speed-history")
async def get_speed_history(network_id: str):
    if not SPEED_HISTORY_FILE.exists():
        return {"history": [], "retention_days": SPEED_HISTORY_DAYS}
    try:
        history = json.loads(SPEED_HISTORY_FILE.read_text())
        filtered = [h for h in history if h.get("network_id") == network_id]
        return {"history": filtered, "retention_days": SPEED_HISTORY_DAYS}
    except (json.JSONDecodeError, OSError):
        return {"history": [], "retention_days": SPEED_HISTORY_DAYS}


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


class DeviceRenameRequest(BaseModel):
    nickname: str


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


@app.post("/api/networks/{network_id}/devices/{device_id}/rename")
async def rename_device(network_id: str, device_id: str, req: DeviceRenameRequest):
    client = await get_client()
    try:
        resp = await client.set_device_nickname(device_id, req.nickname, network_id=network_id)
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


# ── Wi-Fi Password ──────────────────────────────────────────────────────────


@app.get("/api/networks/{network_id}/password")
async def get_password(network_id: str):
    client = await get_client()
    try:
        resp = await client.get_network(network_id=network_id)
        data = resp.get("data", resp)
        return {"password": data.get("password", "")}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Network Name ─────────────────────────────────────────────────────────────


class NetworkNameRequest(BaseModel):
    name: str


@app.post("/api/networks/{network_id}/name")
async def set_network_name(network_id: str, req: NetworkNameRequest):
    client = await get_client()
    try:
        resp = await client.set_network_name(req.name, network_id=network_id)
        return resp.get("data", resp)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Guest Network ────────────────────────────────────────────────────────────


class GuestNetworkRequest(BaseModel):
    enabled: bool
    name: str | None = None
    password: str | None = None


@app.post("/api/networks/{network_id}/guest")
async def set_guest_network(network_id: str, req: GuestNetworkRequest):
    client = await get_client()
    try:
        resp = await client.set_guest_network(
            req.enabled, name=req.name, password=req.password, network_id=network_id
        )
        return resp.get("data", resp)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Device Detail & Actions ──────────────────────────────────────────────────


@app.get("/api/networks/{network_id}/devices/{device_id}")
async def get_device(network_id: str, device_id: str):
    client = await get_client()
    try:
        resp = await client.get_device(device_id, network_id=network_id)
        return resp.get("data", resp)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class DeviceNicknameRequest(BaseModel):
    nickname: str


@app.post("/api/networks/{network_id}/devices/{device_id}/nickname")
async def set_device_nickname(network_id: str, device_id: str, req: DeviceNicknameRequest):
    client = await get_client()
    try:
        resp = await client.set_device_nickname(device_id, req.nickname, network_id=network_id)
        return resp.get("data", resp)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class DevicePriorityRequest(BaseModel):
    prioritized: bool
    duration_minutes: int | None = None


@app.get("/api/networks/{network_id}/devices/{device_id}/priority")
async def get_device_priority(network_id: str, device_id: str):
    client = await get_client()
    try:
        resp = await client.get_device_priority(device_id, network_id=network_id)
        return resp.get("data", resp)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/networks/{network_id}/devices/{device_id}/priority")
async def set_device_priority(network_id: str, device_id: str, req: DevicePriorityRequest):
    client = await get_client()
    try:
        resp = await client.set_device_priority(
            device_id, req.prioritized, duration_minutes=req.duration_minutes, network_id=network_id
        )
        return resp.get("data", resp)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Node LED & Nightlight ────────────────────────────────────────────────────


@app.get("/api/networks/{network_id}/eeros/{eero_id}/led")
async def get_led_status(network_id: str, eero_id: str):
    client = await get_client()
    try:
        resp = await client.get_led_status(eero_id, network_id=network_id)
        data = resp.get("data", resp)
        return {
            "led_on": data.get("led_on", False),
            "brightness": data.get("led_brightness", 100),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class LedRequest(BaseModel):
    enabled: bool


class LedBrightnessRequest(BaseModel):
    brightness: int


@app.post("/api/networks/{network_id}/eeros/{eero_id}/led")
async def set_led(network_id: str, eero_id: str, req: LedRequest):
    client = await get_client()
    try:
        resp = await client.set_led(eero_id, req.enabled, network_id=network_id)
        return resp.get("data", resp)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/networks/{network_id}/eeros/{eero_id}/led/brightness")
async def set_led_brightness(network_id: str, eero_id: str, req: LedBrightnessRequest):
    client = await get_client()
    try:
        resp = await client.set_led_brightness(eero_id, req.brightness, network_id=network_id)
        return resp.get("data", resp)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/networks/{network_id}/eeros/{eero_id}/nightlight")
async def get_nightlight(network_id: str, eero_id: str):
    client = await get_client()
    try:
        resp = await client.get_nightlight(eero_id, network_id=network_id)
        return resp.get("data", resp)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class NightlightRequest(BaseModel):
    enabled: bool | None = None
    brightness: int | None = None
    schedule_enabled: bool | None = None
    schedule_on: str | None = None
    schedule_off: str | None = None
    ambient_light_enabled: bool | None = None


@app.post("/api/networks/{network_id}/eeros/{eero_id}/nightlight")
async def set_nightlight(network_id: str, eero_id: str, req: NightlightRequest):
    client = await get_client()
    try:
        kwargs: dict = {}
        for field in ["enabled", "brightness", "schedule_enabled", "schedule_on", "schedule_off", "ambient_light_enabled"]:
            val = getattr(req, field)
            if val is not None:
                kwargs[field] = val
        resp = await client.set_nightlight(eero_id, network_id=network_id, **kwargs)
        return resp.get("data", resp)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── SQM / QoS ────────────────────────────────────────────────────────────────


@app.get("/api/networks/{network_id}/sqm")
async def get_sqm(network_id: str):
    client = await get_client()
    try:
        resp = await client.get_sqm_settings(network_id=network_id)
        data = resp.get("data", resp)
        sqm = data.get("sqm", data) if isinstance(data, dict) else data
        return sqm
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class SqmEnabledRequest(BaseModel):
    enabled: bool


class SqmConfigureRequest(BaseModel):
    enabled: bool
    upload_mbps: int | None = None
    download_mbps: int | None = None


@app.post("/api/networks/{network_id}/sqm")
async def set_sqm_enabled(network_id: str, req: SqmEnabledRequest):
    client = await get_client()
    try:
        resp = await client.set_sqm_enabled(req.enabled, network_id=network_id)
        return resp.get("data", resp)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/networks/{network_id}/sqm/configure")
async def configure_sqm(network_id: str, req: SqmConfigureRequest):
    client = await get_client()
    try:
        resp = await client.configure_sqm(
            req.enabled, upload_mbps=req.upload_mbps, download_mbps=req.download_mbps, network_id=network_id
        )
        return resp.get("data", resp)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/networks/{network_id}/sqm/auto")
async def set_sqm_auto(network_id: str):
    client = await get_client()
    try:
        resp = await client.set_sqm_auto(network_id=network_id)
        return resp.get("data", resp)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Profile Content Filtering ────────────────────────────────────────────────


class ContentFilterRequest(BaseModel):
    filters: dict


@app.post("/api/networks/{network_id}/profiles/{profile_id}/content-filter")
async def update_content_filter(network_id: str, profile_id: str, req: ContentFilterRequest):
    client = await get_client()
    try:
        resp = await client._api.profiles.update_profile_content_filter(network_id, profile_id, req.filters)
        return resp.get("data", resp)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Profile Domain Block List ────────────────────────────────────────────────


class BlockListRequest(BaseModel):
    domains: list[str]
    block: bool = True


@app.post("/api/networks/{network_id}/profiles/{profile_id}/block-list")
async def update_block_list(network_id: str, profile_id: str, req: BlockListRequest):
    client = await get_client()
    try:
        resp = await client._api.profiles.update_profile_block_list(network_id, profile_id, req.domains, block=req.block)
        return resp.get("data", resp)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Profile Schedule ─────────────────────────────────────────────────────────


class ScheduleRequest(BaseModel):
    time_blocks: list[dict]


class WeekdayBedtimeRequest(BaseModel):
    start_time: str
    end_time: str


@app.post("/api/networks/{network_id}/profiles/{profile_id}/schedule/set")
async def set_profile_schedule(network_id: str, profile_id: str, req: ScheduleRequest):
    client = await get_client()
    try:
        resp = await client.set_profile_schedule(profile_id, req.time_blocks, network_id=network_id)
        return resp.get("data", resp)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/networks/{network_id}/profiles/{profile_id}/schedule/weekday-bedtime")
async def set_weekday_bedtime(network_id: str, profile_id: str, req: WeekdayBedtimeRequest):
    client = await get_client()
    try:
        resp = await client._api.schedule.set_weekday_bedtime(
            network_id, profile_id, req.start_time, req.end_time
        )
        return resp.get("data", resp)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/networks/{network_id}/profiles/{profile_id}/schedule/weekend-bedtime")
async def set_weekend_bedtime(network_id: str, profile_id: str, req: WeekdayBedtimeRequest):
    client = await get_client()
    try:
        resp = await client._api.schedule.set_weekend_bedtime(
            network_id, profile_id, req.start_time, req.end_time
        )
        return resp.get("data", resp)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/networks/{network_id}/profiles/{profile_id}/schedule")
async def clear_profile_schedule(network_id: str, profile_id: str):
    client = await get_client()
    try:
        resp = await client.clear_profile_schedule(profile_id, network_id=network_id)
        return resp.get("data", resp)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Firmware Updates ─────────────────────────────────────────────────────────


@app.get("/api/networks/{network_id}/updates")
async def get_updates(network_id: str):
    client = await get_client()
    try:
        resp = await client.get_updates(network_id=network_id)
        data = resp.get("data", resp)
        updates = data.get("updates", data) if isinstance(data, dict) else data
        return updates
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Network Reboot ───────────────────────────────────────────────────────────


@app.post("/api/networks/{network_id}/reboot")
async def reboot_network(network_id: str):
    client = await get_client()
    try:
        resp = await client.reboot_network(network_id=network_id)
        return resp.get("data", resp)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Thread / Smart Home ─────────────────────────────────────────────────────


@app.get("/api/networks/{network_id}/thread")
async def get_thread(network_id: str):
    client = await get_client()
    try:
        resp = await client.get_thread(network_id=network_id)
        return resp.get("data", resp)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/networks/{network_id}/routing")
async def get_routing(network_id: str):
    client = await get_client()
    try:
        resp = await client.get_routing(network_id=network_id)
        return resp.get("data", resp)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Device Blacklist ─────────────────────────────────────────────────────────


@app.get("/api/networks/{network_id}/blacklist")
async def get_blacklist(network_id: str):
    client = await get_client()
    try:
        resp = await client.get_blacklist(network_id=network_id)
        return resp.get("data", resp)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/networks/{network_id}/blacklist/{device_id}")
async def add_to_blacklist(network_id: str, device_id: str):
    client = await get_client()
    try:
        resp = await client._api.blacklist.add_to_blacklist(network_id, device_id)
        return resp.get("data", resp)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/networks/{network_id}/blacklist/{device_id}")
async def remove_from_blacklist(network_id: str, device_id: str):
    client = await get_client()
    try:
        resp = await client._api.blacklist.remove_from_blacklist(network_id, device_id)
        return resp.get("data", resp)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── General Network Settings ────────────────────────────────────────────────


@app.get("/api/networks/{network_id}/settings")
async def get_settings(network_id: str):
    client = await get_client()
    try:
        resp = await client.get_network(network_id=network_id)
        data = resp.get("data", resp)
        return {
            "name": data.get("name", ""),
            "password": data.get("password", ""),
            "timezone": data.get("timezone", ""),
            "sqm": data.get("sqm", {}),
            "upnp": data.get("upnp"),
            "ipv6_upstream": data.get("ipv6_upstream"),
            "band_steering": data.get("band_steering"),
            "wpa3": data.get("wpa3"),
            "thread": data.get("thread"),
            "guest_network": data.get("guest_network", {}),
            "dns": data.get("dns", {}),
            "premium_status": data.get("premium_status", ""),
            "updates": data.get("updates", {}),
            "speed": data.get("speed", {}),
            "wan_ip": data.get("wan_ip", ""),
            "gateway_ip": data.get("gateway_ip", ""),
            "status": data.get("status", ""),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Static Files (production / Docker mode) ──────────────────────────────────

STATIC_DIR = Path(__file__).parent / "static"
if STATIC_DIR.exists():
    app.mount("/", StaticFiles(directory=str(STATIC_DIR), html=True), name="static")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8420, reload=True)
