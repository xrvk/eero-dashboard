"""Facade wrapping eero-api internals (client._api.*) in clean methods.

Service modules should call these instead of accessing client._api directly.

NOTE: Several eero-api library methods send PUT to the wrong endpoint
(networks/{id} instead of networks/{id}/settings). Our facade methods
route to the correct endpoints based on live API testing.
"""

from typing import Any

from eero import EeroClient


async def _get_token(client: EeroClient) -> str:
    return await client._api.networks._auth_api.get_auth_token()


async def _put_settings(client: EeroClient, network_id: str, payload: dict) -> dict:
    """PUT to /networks/{id}/settings — the correct endpoint for network mutations.

    The eero-api library incorrectly PUTs to /networks/{id} which is silently
    ignored by the eero cloud API. This sends to /settings instead.
    """
    token = await _get_token(client)
    return await client._api.networks.put(
        f"networks/{network_id}/settings",
        auth_token=token,
        json=payload,
    )


# ── Network settings (via /settings endpoint) ───────────────────────────────

async def configure_security(
    client: EeroClient, network_id: str, **kwargs: Any,
) -> dict:
    """Set security toggles (wpa3, band_steering, upnp, ipv6, thread)."""
    payload: dict = {}
    for key, value in kwargs.items():
        if value is None:
            continue
        if key == "ipv6":
            payload["ipv6_upstream"] = value
            payload["ipv6_downstream"] = value
        else:
            payload[key] = value
    return await _put_settings(client, network_id, payload)


async def set_sqm_enabled(client: EeroClient, network_id: str, enabled: bool) -> dict:
    return await _put_settings(client, network_id, {"sqm": {"enabled": enabled}})


async def configure_sqm(
    client: EeroClient, network_id: str,
    enabled: bool, upload_mbps: int | None = None, download_mbps: int | None = None,
) -> dict:
    sqm: dict = {"enabled": enabled}
    if upload_mbps is not None:
        sqm["upload_bandwidth_mbps"] = upload_mbps
    if download_mbps is not None:
        sqm["download_bandwidth_mbps"] = download_mbps
    return await _put_settings(client, network_id, {"sqm": sqm})


async def set_sqm_auto(client: EeroClient, network_id: str) -> dict:
    return await _put_settings(client, network_id, {"sqm": {"enabled": True}})


async def set_dns_caching(client: EeroClient, network_id: str, enabled: bool) -> dict:
    return await _put_settings(client, network_id, {"dns": {"caching": enabled}})


async def set_dns_mode(
    client: EeroClient, network_id: str,
    mode: str, custom_servers: list[str] | None = None,
) -> dict:
    payload: dict = {"dns": {"mode": mode}}
    if custom_servers is not None:
        payload["dns"]["custom"] = {"ips": custom_servers}
    return await _put_settings(client, network_id, payload)


async def set_network_name(client: EeroClient, network_id: str, name: str) -> dict:
    return await _put_settings(client, network_id, {"name": name})


async def pause_device(client: EeroClient, network_id: str, device_id: str, paused: bool) -> dict:
    """Pause/unpause a device via PUT /devices/{id} (not /networks/{id})."""
    token = await _get_token(client)
    return await client._api.networks.put(
        f"devices/{device_id}",
        auth_token=token,
        json={"paused": paused},
    )


# ── Guest network (correct URL: guestnetwork, not guest_network) ────────────

async def set_guest_network(
    client: EeroClient, network_id: str,
    enabled: bool, name: str | None = None, password: str | None = None,
) -> dict:
    token = await _get_token(client)
    payload: dict = {"enabled": enabled}
    if name is not None:
        payload["name"] = name
    if password is not None:
        payload["password"] = password
    return await client._api.networks.put(
        f"networks/{network_id}/guestnetwork",
        auth_token=token,
        json=payload,
    )


# ── Profiles (need raw API access for CRUD) ─────────────────────────────────

async def create_profile(client: EeroClient, network_id: str, name: str) -> dict:
    token = await _get_token(client)
    return await client._api.profiles.post(
        f"networks/{network_id}/profiles",
        auth_token=token,
        json={"name": name},
    )


async def rename_profile(client: EeroClient, network_id: str, profile_id: str, name: str) -> dict:
    token = await _get_token(client)
    return await client._api.profiles.put(
        f"networks/{network_id}/profiles/{profile_id}",
        auth_token=token,
        json={"name": name},
    )


async def delete_profile(client: EeroClient, network_id: str, profile_id: str) -> dict:
    token = await _get_token(client)
    return await client._api.profiles.delete(
        f"networks/{network_id}/profiles/{profile_id}",
        auth_token=token,
    )


# ── Blacklist, forwards, reservations ────────────────────────────────────────

async def add_to_blacklist(client: EeroClient, network_id: str, device_id: str) -> dict:
    return await client._api.blacklist.add_to_blacklist(network_id, device_id)


async def remove_from_blacklist(client: EeroClient, network_id: str, device_id: str) -> dict:
    return await client._api.blacklist.remove_from_blacklist(network_id, device_id)


async def create_forward(client: EeroClient, network_id: str, forward_data: dict) -> dict:
    return await client._api.forwards.create_forward(network_id, forward_data)


async def delete_forward(client: EeroClient, network_id: str, forward_id: str) -> dict:
    return await client._api.forwards.delete_forward(network_id, forward_id)


async def create_reservation(client: EeroClient, network_id: str, reservation_data: dict) -> dict:
    return await client._api.reservations.create_reservation(network_id, reservation_data)


async def delete_reservation(client: EeroClient, network_id: str, reservation_id: str) -> dict:
    return await client._api.reservations.delete_reservation(network_id, reservation_id)
