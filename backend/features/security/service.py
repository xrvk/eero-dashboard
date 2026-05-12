from eero import EeroClient

from core import cache
from core.cache import keys
from core.dry_run import is_dry_run, block_unmocked_mutation
from core.errors import translate_errors


async def get_security(client: EeroClient, network_id: str):
    async def _fetch():
        with translate_errors(code="get_security_failed", message="Failed to fetch security settings"):
            resp = await client.get_security_settings(network_id)
            return resp.get("data", resp)
    return await cache.cached(keys.security(network_id), _fetch)


async def update_security(client: EeroClient, network_id: str, **kwargs):
    if is_dry_run():
        block_unmocked_mutation("update_security")
    with translate_errors(code="update_security_failed", message="Failed to update security settings"):
        resp = await client.configure_security(network_id=network_id, **kwargs)
        cache.invalidate_network(network_id)
        cache.clear_upstream("network", network_id=network_id)
        return resp.get("data", resp)
