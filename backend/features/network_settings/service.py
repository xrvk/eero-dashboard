from eero import EeroClient

from core import cache, facade
from core.cache import keys
from core.errors import translate_errors


async def get_password(client: EeroClient, network_id: str):
    async def _fetch():
        with translate_errors(code="get_password_failed", message="Failed to fetch Wi-Fi password"):
            resp = await client.get_network(network_id=network_id)
            data = resp.get("data", resp)
            return {"password": data.get("password", "")}
    return await cache.cached(keys.password(network_id), _fetch)


async def set_network_name(client: EeroClient, network_id: str, name: str):
    with translate_errors(code="set_name_failed", message="Failed to set network name"):
        resp = await facade.set_network_name(client, network_id, name)
        cache.invalidate_network(network_id)
        cache.clear_upstream("network", network_id=network_id)
        return resp.get("data", resp)


async def set_guest_network(client: EeroClient, network_id: str, enabled: bool, name: str | None, password: str | None):
    with translate_errors(code="set_guest_failed", message="Failed to set guest network"):
        resp = await facade.set_guest_network(
            client, network_id, enabled, name=name, password=password,
        )
        cache.invalidate_network(network_id)
        cache.clear_upstream("network", network_id=network_id)
        return resp.get("data", resp)


async def get_sqm(client: EeroClient, network_id: str):
    async def _fetch():
        with translate_errors(code="get_sqm_failed", message="Failed to fetch SQM settings"):
            resp = await client.get_sqm_settings(network_id=network_id)
            data = resp.get("data", resp)
            sqm = data.get("sqm", data) if isinstance(data, dict) else data
            if isinstance(sqm, bool):
                return {"enabled": sqm}
            return sqm
    return await cache.cached(keys.sqm(network_id), _fetch)


async def set_sqm_enabled(client: EeroClient, network_id: str, enabled: bool):
    with translate_errors(code="set_sqm_failed", message="Failed to set SQM enabled"):
        resp = await facade.set_sqm_enabled(client, network_id, enabled)
        cache.invalidate(keys.sqm(network_id))
        cache.invalidate(keys.network(network_id))
        cache.invalidate(keys.settings(network_id))
        cache.clear_upstream("network", network_id=network_id)
        return resp.get("data", resp)


async def configure_sqm(client: EeroClient, network_id: str, enabled: bool, upload_mbps: int | None, download_mbps: int | None):
    with translate_errors(code="configure_sqm_failed", message="Failed to configure SQM"):
        resp = await facade.configure_sqm(client, network_id, enabled, upload_mbps, download_mbps)
        cache.invalidate(keys.sqm(network_id))
        cache.invalidate(keys.network(network_id))
        cache.invalidate(keys.settings(network_id))
        cache.clear_upstream("network", network_id=network_id)
        return resp.get("data", resp)


async def set_sqm_auto(client: EeroClient, network_id: str):
    with translate_errors(code="set_sqm_auto_failed", message="Failed to set SQM auto"):
        resp = await facade.set_sqm_auto(client, network_id)
        cache.invalidate(keys.sqm(network_id))
        cache.invalidate(keys.network(network_id))
        cache.invalidate(keys.settings(network_id))
        cache.clear_upstream("network", network_id=network_id)
        return resp.get("data", resp)


async def get_updates(client: EeroClient, network_id: str):
    async def _fetch():
        with translate_errors(code="get_updates_failed", message="Failed to fetch firmware updates"):
            resp = await client.get_updates(network_id=network_id)
            data = resp.get("data", resp)
            updates = data.get("updates", data) if isinstance(data, dict) else data
            return updates
    return await cache.cached(keys.updates(network_id), _fetch)


async def reboot_network(client: EeroClient, network_id: str):
    with translate_errors(code="reboot_network_failed", message="Failed to reboot network"):
        resp = await client.reboot_network(network_id=network_id)
        return resp.get("data", resp)


async def get_thread(client: EeroClient, network_id: str):
    async def _fetch():
        with translate_errors(code="get_thread_failed", message="Failed to fetch thread settings"):
            resp = await client.get_thread(network_id=network_id)
            return resp.get("data", resp)
    return await cache.cached(keys.thread(network_id), _fetch)


async def get_routing(client: EeroClient, network_id: str):
    async def _fetch():
        with translate_errors(code="get_routing_failed", message="Failed to fetch routing settings"):
            resp = await client.get_routing(network_id=network_id)
            return resp.get("data", resp)
    return await cache.cached(keys.routing(network_id), _fetch)


async def get_blacklist(client: EeroClient, network_id: str):
    async def _fetch():
        with translate_errors(code="get_blacklist_failed", message="Failed to fetch blacklist"):
            resp = await client.get_blacklist(network_id=network_id)
            return resp.get("data", resp)
    return await cache.cached(keys.blacklist(network_id), _fetch)


async def add_to_blacklist(client: EeroClient, network_id: str, device_id: str):
    with translate_errors(code="add_blacklist_failed", message="Failed to add to blacklist"):
        resp = await facade.add_to_blacklist(client, network_id, device_id)
        cache.invalidate(keys.blacklist(network_id))
        cache.clear_upstream("devices", network_id=network_id)
        return resp.get("data", resp)


async def remove_from_blacklist(client: EeroClient, network_id: str, device_id: str):
    with translate_errors(code="remove_blacklist_failed", message="Failed to remove from blacklist"):
        resp = await facade.remove_from_blacklist(client, network_id, device_id)
        cache.invalidate(keys.blacklist(network_id))
        cache.clear_upstream("devices", network_id=network_id)
        return resp.get("data", resp)
