"""Facade wrapping eero-api internals (client._api.*) for operations
that lack high-level client wrappers.

Most mutations now use the upstream EeroClient methods directly in
service modules. This facade only covers blacklist, forwards, and
reservations which still require low-level API access.
"""

from eero import EeroClient

from core.dry_run import is_dry_run


# ── Blacklist, forwards, reservations ────────────────────────────────────────

async def add_to_blacklist(client: EeroClient, network_id: str, device_id: str) -> dict:
    if is_dry_run():
        from core.dry_run import block_unmocked_mutation
        block_unmocked_mutation("add_to_blacklist")
    return await client._api.blacklist.add_to_blacklist(network_id, device_id)


async def remove_from_blacklist(client: EeroClient, network_id: str, device_id: str) -> dict:
    if is_dry_run():
        from core.dry_run import block_unmocked_mutation
        block_unmocked_mutation("remove_from_blacklist")
    return await client._api.blacklist.remove_from_blacklist(network_id, device_id)


async def create_forward(client: EeroClient, network_id: str, forward_data: dict) -> dict:
    if is_dry_run():
        from core.dry_run import block_unmocked_mutation
        block_unmocked_mutation("create_forward")
    return await client._api.forwards.create_forward(network_id, forward_data)


async def delete_forward(client: EeroClient, network_id: str, forward_id: str) -> dict:
    if is_dry_run():
        from core.dry_run import block_unmocked_mutation
        block_unmocked_mutation("delete_forward")
    return await client._api.forwards.delete_forward(network_id, forward_id)


async def create_reservation(client: EeroClient, network_id: str, reservation_data: dict) -> dict:
    if is_dry_run():
        from core.dry_run import block_unmocked_mutation
        block_unmocked_mutation("create_reservation")
    return await client._api.reservations.create_reservation(network_id, reservation_data)


async def delete_reservation(client: EeroClient, network_id: str, reservation_id: str) -> dict:
    if is_dry_run():
        from core.dry_run import block_unmocked_mutation
        block_unmocked_mutation("delete_reservation")
    return await client._api.reservations.delete_reservation(network_id, reservation_id)
