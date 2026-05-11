from eero import EeroClient

from core import cache
from core.cache import keys
from core.errors import translate_errors


async def get_forwards(client: EeroClient, network_id: str):
    async def _fetch():
        with translate_errors(code="get_forwards_failed", message="Failed to fetch port forwards"):
            resp = await client.get_forwards(network_id)
            return resp.get("data", resp)
    return await cache.cached(keys.forwards(network_id), _fetch)


async def create_forward(client: EeroClient, network_id: str, forward_data: dict):
    with translate_errors(code="create_forward_failed", message="Failed to create port forward"):
        resp = await client._api.forwards.create_forward(network_id, forward_data)
        cache.invalidate(keys.forwards(network_id))
        cache.clear_upstream("network", network_id=network_id)
        return resp.get("data", resp)


async def delete_forward(client: EeroClient, network_id: str, forward_id: str):
    with translate_errors(code="delete_forward_failed", message="Failed to delete port forward"):
        resp = await client._api.forwards.delete_forward(network_id, forward_id)
        cache.invalidate(keys.forwards(network_id))
        cache.clear_upstream("network", network_id=network_id)
        return resp.get("data", resp)


async def get_reservations(client: EeroClient, network_id: str):
    async def _fetch():
        with translate_errors(code="get_reservations_failed", message="Failed to fetch reservations"):
            resp = await client.get_reservations(network_id)
            return resp.get("data", resp)
    return await cache.cached(keys.reservations(network_id), _fetch)


async def create_reservation(client: EeroClient, network_id: str, reservation_data: dict):
    with translate_errors(code="create_reservation_failed", message="Failed to create reservation"):
        resp = await client._api.reservations.create_reservation(network_id, reservation_data)
        cache.invalidate(keys.reservations(network_id))
        cache.clear_upstream("network", network_id=network_id)
        return resp.get("data", resp)


async def delete_reservation(client: EeroClient, network_id: str, reservation_id: str):
    with translate_errors(code="delete_reservation_failed", message="Failed to delete reservation"):
        resp = await client._api.reservations.delete_reservation(network_id, reservation_id)
        cache.invalidate(keys.reservations(network_id))
        cache.clear_upstream("network", network_id=network_id)
        return resp.get("data", resp)
