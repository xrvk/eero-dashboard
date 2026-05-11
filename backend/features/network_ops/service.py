import asyncio

from fastapi import HTTPException

from eero import EeroClient

from core import cache


def _data(payload: dict):
    """Normalize eero-api responses to the inner `data` payload when present."""
    return payload.get("data", payload)


async def prefetch(client: EeroClient, network_id: str):
    """Pre-populate the cache with parallel eero API calls."""
    async def _net():
        return _data(await client.get_network(network_id))

    async def _devices():
        resp = await client.get_devices(network_id)
        devices = resp.get("data", resp.get("devices", []))
        if isinstance(devices, dict):
            devices = devices.get("devices", [])
        return {"devices": devices}

    async def _eeros():
        resp = await client.get_eeros(network_id)
        eeros = resp.get("data", resp.get("eeros", []))
        if isinstance(eeros, dict):
            eeros = eeros.get("eeros", [])
        return {"eeros": eeros}

    async def _profiles():
        resp = await client.get_profiles(network_id)
        profiles = resp.get("data", resp.get("profiles", []))
        if isinstance(profiles, dict):
            profiles = profiles.get("profiles", [])
        return {"profiles": profiles}

    async def _security():
        return _data(await client.get_security_settings(network_id))

    async def _dns():
        return _data(await client.get_dns_settings(network_id))

    async def _updates():
        resp = await client.get_updates(network_id=network_id)
        data = resp.get("data", resp)
        return data.get("updates", data) if isinstance(data, dict) else data

    async def _thread():
        return _data(await client.get_thread(network_id=network_id))

    async def _blacklist():
        return _data(await client.get_blacklist(network_id=network_id))

    async def _sqm():
        resp = await client.get_sqm_settings(network_id=network_id)
        data = resp.get("data", resp)
        return data.get("sqm", data) if isinstance(data, dict) else data

    async def _forwards():
        resp = await client.get_forwards(network_id)
        return resp.get("data", resp)

    async def _reservations():
        resp = await client.get_reservations(network_id)
        return resp.get("data", resp)

    keys_and_fns = [
        (f"net:{network_id}:network", _net),
        (f"net:{network_id}:devices", _devices),
        (f"net:{network_id}:eeros", _eeros),
        (f"net:{network_id}:profiles", _profiles),
        (f"net:{network_id}:security", _security),
        (f"net:{network_id}:dns", _dns),
        (f"net:{network_id}:updates", _updates),
        (f"net:{network_id}:thread", _thread),
        (f"net:{network_id}:blacklist", _blacklist),
        (f"net:{network_id}:sqm", _sqm),
        (f"net:{network_id}:forwards", _forwards),
        (f"net:{network_id}:reservations", _reservations),
    ]

    async def _run(key, fn):
        try:
            result = await fn()
            cache.put(key, result)
            return result
        except Exception:
            return None

    results = await asyncio.gather(*[_run(k, f) for k, f in keys_and_fns])
    ok = sum(1 for r in results if r is not None)
    return {"status": "ok", "cached": ok, "total": len(results)}


async def get_dns(client: EeroClient, network_id: str):
    return await cache.cached(
        f"net:{network_id}:dns",
        lambda: _fetch_dns(client, network_id),
    )


async def _fetch_dns(client: EeroClient, network_id: str):
    try:
        return _data(await client.get_dns_settings(network_id))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


async def set_dns_mode(client: EeroClient, network_id: str, mode: str, custom_servers: list[str] | None = None):
    try:
        result = _data(
            await client.set_dns_mode(mode, custom_servers=custom_servers, network_id=network_id)
        )
        cache.invalidate_network(network_id)
        return result
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


async def set_dns_caching(client: EeroClient, network_id: str, enabled: bool):
    try:
        result = _data(await client.set_dns_caching(enabled, network_id=network_id))
        cache.invalidate_network(network_id)
        return result
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


async def get_activity(client: EeroClient, network_id: str):
    return await cache.cached(
        f"net:{network_id}:activity",
        lambda: _fetch_activity(client, network_id),
    )


async def _fetch_activity(client: EeroClient, network_id: str):
    try:
        return _data(await client.get_activity(network_id))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


async def get_activity_history(client: EeroClient, network_id: str, period: str = "day"):
    return await cache.cached(
        f"net:{network_id}:activity:history:{period}",
        lambda: _fetch_activity_history(client, network_id, period),
    )


async def _fetch_activity_history(client: EeroClient, network_id: str, period: str):
    try:
        return _data(await client.get_activity_history(network_id, period=period))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


async def get_activity_clients(client: EeroClient, network_id: str):
    return await cache.cached(
        f"net:{network_id}:activity:clients",
        lambda: _fetch_activity_clients(client, network_id),
    )


async def _fetch_activity_clients(client: EeroClient, network_id: str):
    try:
        return _data(await client.get_activity_clients(network_id))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


async def get_activity_categories(client: EeroClient, network_id: str):
    return await cache.cached(
        f"net:{network_id}:activity:categories",
        lambda: _fetch_activity_categories(client, network_id),
    )


async def _fetch_activity_categories(client: EeroClient, network_id: str):
    try:
        return _data(await client.get_activity_categories(network_id))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


async def get_diagnostics(client: EeroClient, network_id: str):
    return await cache.cached(
        f"net:{network_id}:diagnostics",
        lambda: _fetch_diagnostics(client, network_id),
    )


async def _fetch_diagnostics(client: EeroClient, network_id: str):
    try:
        return _data(await client.get_diagnostics(network_id))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


async def run_diagnostics(client: EeroClient, network_id: str):
    try:
        result = _data(await client.run_diagnostics(network_id))
        cache.invalidate(f"net:{network_id}:diagnostics")
        return result
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
