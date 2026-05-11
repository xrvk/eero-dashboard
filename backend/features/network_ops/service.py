import asyncio

from fastapi import HTTPException

from eero import EeroClient


def _data(payload: dict):
    """Normalize eero-api responses to the inner `data` payload when present."""
    return payload.get("data", payload)


async def prefetch(client: EeroClient, network_id: str):
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
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


async def get_dns(client: EeroClient, network_id: str):
    try:
        return _data(await client.get_dns_settings(network_id))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


async def set_dns_mode(client: EeroClient, network_id: str, mode: str, custom_servers: list[str] | None = None):
    try:
        return _data(
            await client.set_dns_mode(mode, custom_servers=custom_servers, network_id=network_id)
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


async def set_dns_caching(client: EeroClient, network_id: str, enabled: bool):
    try:
        return _data(await client.set_dns_caching(enabled, network_id=network_id))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


async def get_activity(client: EeroClient, network_id: str):
    try:
        return _data(await client.get_activity(network_id))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


async def get_activity_history(client: EeroClient, network_id: str, period: str = "day"):
    try:
        return _data(await client.get_activity_history(network_id, period=period))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


async def get_activity_clients(client: EeroClient, network_id: str):
    try:
        return _data(await client.get_activity_clients(network_id))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


async def get_activity_categories(client: EeroClient, network_id: str):
    try:
        return _data(await client.get_activity_categories(network_id))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


async def get_diagnostics(client: EeroClient, network_id: str):
    try:
        return _data(await client.get_diagnostics(network_id))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


async def run_diagnostics(client: EeroClient, network_id: str):
    try:
        return _data(await client.run_diagnostics(network_id))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
