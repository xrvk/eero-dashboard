from eero import EeroClient

from core import cache
from core.cache import keys
from core.errors import translate_errors


def _data(payload: dict):
    return payload.get("data", payload)


def _extract_profiles(resp: dict) -> list:
    profiles = resp.get("data", resp.get("profiles", []))
    if isinstance(profiles, dict):
        profiles = profiles.get("profiles", [])
    return profiles


async def list_profiles(client: EeroClient, network_id: str):
    async def _fetch():
        with translate_errors(code="list_profiles_failed", message="Failed to fetch profiles"):
            resp = await client.get_profiles(network_id)
            return {"profiles": _extract_profiles(resp)}
    return await cache.cached(keys.profile_list(network_id), _fetch)


async def get_profile(client: EeroClient, network_id: str, profile_id: str):
    async def _fetch():
        with translate_errors(code="get_profile_failed", message="Failed to fetch profile"):
            resp = await client.get_profile(profile_id, network_id)
            return _data(resp)
    return await cache.cached(keys.profile(network_id, profile_id), _fetch)


async def pause_profile(client: EeroClient, network_id: str, profile_id: str, paused: bool):
    with translate_errors(code="pause_profile_failed", message="Failed to update profile pause status"):
        resp = await client.pause_profile(profile_id, paused, network_id=network_id)
        cache.invalidate(keys.profile_prefix(network_id))
        cache.clear_upstream("profiles", network_id=network_id)
        return _data(resp)


async def get_blocked_apps(client: EeroClient, network_id: str, profile_id: str):
    async def _fetch():
        with translate_errors(code="get_blocked_apps_failed", message="Failed to fetch blocked apps"):
            resp = await client.get_blocked_applications(profile_id, network_id=network_id)
            return _data(resp)
    return await cache.cached(keys.profile_sub(network_id, profile_id, "blocked_apps"), _fetch)


async def set_blocked_apps(client: EeroClient, network_id: str, profile_id: str, applications: list[str]):
    with translate_errors(code="set_blocked_apps_failed", message="Failed to update blocked apps"):
        resp = await client.set_blocked_applications(profile_id, applications, network_id=network_id)
        cache.invalidate(keys.profile(network_id, profile_id))
        cache.clear_upstream("profiles", network_id=network_id)
        return _data(resp)


async def set_bedtime(
    client: EeroClient,
    network_id: str,
    profile_id: str,
    start_time: str,
    end_time: str,
    days: list[str] | None = None,
):
    with translate_errors(code="set_bedtime_failed", message="Failed to set bedtime"):
        resp = await client.enable_bedtime(
            profile_id, start_time, end_time, days=days, network_id=network_id
        )
        cache.invalidate(keys.profile(network_id, profile_id))
        cache.clear_upstream("profiles", network_id=network_id)
        return _data(resp)


async def get_schedule(client: EeroClient, network_id: str, profile_id: str):
    async def _fetch():
        with translate_errors(code="get_schedule_failed", message="Failed to fetch schedule"):
            resp = await client.get_profile_schedule(profile_id, network_id=network_id)
            return _data(resp)
    return await cache.cached(keys.profile_sub(network_id, profile_id, "schedule"), _fetch)


async def set_schedule(client: EeroClient, network_id: str, profile_id: str, time_blocks: list[dict]):
    with translate_errors(code="set_schedule_failed", message="Failed to set schedule"):
        resp = await client.set_profile_schedule(profile_id, time_blocks, network_id=network_id)
        cache.invalidate(keys.profile(network_id, profile_id))
        cache.clear_upstream("profiles", network_id=network_id)
        return _data(resp)


async def clear_schedule(client: EeroClient, network_id: str, profile_id: str):
    with translate_errors(code="clear_schedule_failed", message="Failed to clear schedule"):
        resp = await client.clear_profile_schedule(profile_id, network_id=network_id)
        cache.invalidate(keys.profile(network_id, profile_id))
        cache.clear_upstream("profiles", network_id=network_id)
        return _data(resp)


async def set_devices(client: EeroClient, network_id: str, profile_id: str, device_urls: list[str]):
    with translate_errors(code="set_devices_failed", message="Failed to update profile devices"):
        resp = await client.set_profile_devices(profile_id, device_urls, network_id=network_id)
        cache.invalidate(keys.profile_prefix(network_id))
        cache.clear_upstream("profiles", network_id=network_id)
        return _data(resp)


async def create_profile(client: EeroClient, network_id: str, name: str):
    with translate_errors(code="create_profile_failed", message="Failed to create profile"):
        auth_token = await client._api.profiles._auth_api.get_auth_token()
        resp = await client._api.profiles.post(
            f"networks/{network_id}/profiles",
            auth_token=auth_token,
            json={"name": name},
        )
        cache.invalidate(keys.profile_prefix(network_id))
        cache.clear_upstream("profiles", network_id=network_id)
        return _data(resp)


async def rename_profile(client: EeroClient, network_id: str, profile_id: str, name: str):
    with translate_errors(code="rename_profile_failed", message="Failed to rename profile"):
        auth_token = await client._api.profiles._auth_api.get_auth_token()
        resp = await client._api.profiles.put(
            f"networks/{network_id}/profiles/{profile_id}",
            auth_token=auth_token,
            json={"name": name},
        )
        cache.invalidate(keys.profile_prefix(network_id))
        cache.clear_upstream("profiles", network_id=network_id)
        return _data(resp)


async def delete_profile(client: EeroClient, network_id: str, profile_id: str):
    with translate_errors(code="delete_profile_failed", message="Failed to delete profile"):
        auth_token = await client._api.profiles._auth_api.get_auth_token()
        resp = await client._api.profiles.delete(
            f"networks/{network_id}/profiles/{profile_id}",
            auth_token=auth_token,
        )
        cache.invalidate(keys.profile_prefix(network_id))
        cache.clear_upstream("profiles", network_id=network_id)
        return resp
