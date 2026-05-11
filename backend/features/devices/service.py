from eero import EeroClient

from core import cache, facade
from core.cache import keys
from core.dry_run import is_dry_run, block_unmocked_mutation
from core.errors import translate_errors


async def list_devices(client: EeroClient, network_id: str):
    async def _fetch():
        with translate_errors(code="list_devices_failed", message="Failed to fetch devices"):
            resp = await client.get_devices(network_id)
            devices = resp.get("data", resp.get("devices", []))
            if isinstance(devices, dict):
                devices = devices.get("devices", [])
            return {"devices": devices}
    return await cache.cached(keys.device_list(network_id), _fetch)


async def pause_device(client: EeroClient, network_id: str, device_id: str, paused: bool):
    with translate_errors(code="pause_device_failed", message="Failed to pause device"):
        resp = await facade.pause_device(client, network_id, device_id, paused)
        cache.invalidate(keys.device_prefix(network_id))
        cache.clear_upstream("devices", network_id=network_id)
        return resp.get("data", resp)


async def block_device(client: EeroClient, network_id: str, device_id: str, blocked: bool):
    if is_dry_run():
        block_unmocked_mutation("block_device")
    with translate_errors(code="block_device_failed", message="Failed to update block status"):
        resp = await client.block_device(device_id, blocked, network_id=network_id)
        cache.invalidate(keys.device_prefix(network_id))
        cache.clear_upstream("devices", network_id=network_id)
        return resp.get("data", resp)


async def get_device(client: EeroClient, network_id: str, device_id: str):
    async def _fetch():
        with translate_errors(code="get_device_failed", message="Failed to fetch device"):
            resp = await client.get_device(device_id, network_id=network_id)
            return resp.get("data", resp)
    return await cache.cached(keys.device(network_id, device_id), _fetch)


async def set_device_nickname(client: EeroClient, network_id: str, device_id: str, nickname: str):
    if is_dry_run():
        block_unmocked_mutation("set_device_nickname")
    with translate_errors(code="rename_device_failed", message="Failed to update nickname"):
        resp = await client.set_device_nickname(device_id, nickname, network_id=network_id)
        cache.invalidate(keys.device_prefix(network_id))
        cache.clear_upstream("devices", network_id=network_id)
        return resp.get("data", resp)


async def get_device_priority(client: EeroClient, network_id: str, device_id: str):
    async def _fetch():
        with translate_errors(code="get_device_priority_failed", message="Failed to fetch priority"):
            resp = await client.get_device_priority(device_id, network_id=network_id)
            return resp.get("data", resp)
    return await cache.cached(keys.device_sub(network_id, device_id, "priority"), _fetch)


async def set_device_priority(
    client: EeroClient,
    network_id: str,
    device_id: str,
    prioritized: bool,
    duration_minutes: int | None,
):
    if is_dry_run():
        block_unmocked_mutation("set_device_priority")
    with translate_errors(code="set_device_priority_failed", message="Failed to update priority"):
        resp = await client.set_device_priority(
            device_id, prioritized, duration_minutes=duration_minutes, network_id=network_id
        )
        cache.invalidate(keys.device(network_id, device_id))
        cache.invalidate(keys.device_list(network_id))
        cache.clear_upstream("devices", network_id=network_id)
        return resp.get("data", resp)
