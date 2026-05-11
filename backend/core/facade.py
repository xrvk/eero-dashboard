"""Facade wrapping eero-api internals (client._api.*) in clean methods.

Service modules should call these instead of accessing client._api directly.
"""

from eero import EeroClient


async def create_profile(client: EeroClient, network_id: str, name: str) -> dict:
    auth_token = await client._api.profiles._auth_api.get_auth_token()
    return await client._api.profiles.post(
        f"networks/{network_id}/profiles",
        auth_token=auth_token,
        json={"name": name},
    )


async def rename_profile(client: EeroClient, network_id: str, profile_id: str, name: str) -> dict:
    auth_token = await client._api.profiles._auth_api.get_auth_token()
    return await client._api.profiles.put(
        f"networks/{network_id}/profiles/{profile_id}",
        auth_token=auth_token,
        json={"name": name},
    )


async def delete_profile(client: EeroClient, network_id: str, profile_id: str) -> dict:
    auth_token = await client._api.profiles._auth_api.get_auth_token()
    return await client._api.profiles.delete(
        f"networks/{network_id}/profiles/{profile_id}",
        auth_token=auth_token,
    )


async def set_guest_network(
    client: EeroClient, network_id: str,
    enabled: bool, name: str | None = None, password: str | None = None,
) -> dict:
    """Work around eero-api using wrong URL (guest_network vs guestnetwork)."""
    auth_token = await client._api.networks._auth_api.get_auth_token()
    payload: dict = {"enabled": enabled}
    if name is not None:
        payload["name"] = name
    if password is not None:
        payload["password"] = password
    return await client._api.networks.put(
        f"networks/{network_id}/guestnetwork",
        auth_token=auth_token,
        json=payload,
    )


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
