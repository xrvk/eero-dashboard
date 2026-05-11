from eero import EeroClient

from core.errors import translate_errors


def _data(payload: dict):
    return payload.get("data", payload)


async def list_networks(client: EeroClient):
    with translate_errors(code="list_networks_failed", message="Failed to fetch networks"):
        resp = await client.get_networks()
        networks = resp.get("data", {}).get("networks", resp.get("networks", []))
        return {"networks": networks}


async def get_network(client: EeroClient, network_id: str):
    with translate_errors(code="get_network_failed", message="Failed to fetch network"):
        resp = await client.get_network(network_id)
        return _data(resp)


async def list_eeros(client: EeroClient, network_id: str):
    with translate_errors(code="list_eeros_failed", message="Failed to fetch eero nodes"):
        resp = await client.get_eeros(network_id)
        eeros = resp.get("data", resp.get("eeros", []))
        if isinstance(eeros, dict):
            eeros = eeros.get("eeros", [])
        return {"eeros": eeros}


async def list_profiles(client: EeroClient, network_id: str):
    with translate_errors(code="list_profiles_failed", message="Failed to fetch profiles"):
        resp = await client.get_profiles(network_id)
        profiles = resp.get("data", resp.get("profiles", []))
        if isinstance(profiles, dict):
            profiles = profiles.get("profiles", [])
        return {"profiles": profiles}


async def get_settings(client: EeroClient, network_id: str):
    with translate_errors(code="get_settings_failed", message="Failed to fetch settings"):
        resp = await client.get_network(network_id=network_id)
        data = _data(resp)
        return {
            "name": data.get("name", ""),
            "password": data.get("password", ""),
            "timezone": data.get("timezone", ""),
            "sqm": data.get("sqm", {}),
            "upnp": data.get("upnp"),
            "ipv6_upstream": data.get("ipv6_upstream"),
            "band_steering": data.get("band_steering"),
            "wpa3": data.get("wpa3"),
            "thread": data.get("thread"),
            "guest_network": data.get("guest_network", {}),
            "dns": data.get("dns", {}),
            "premium_status": data.get("premium_status", ""),
            "updates": data.get("updates", {}),
            "speed": data.get("speed", {}),
            "wan_ip": data.get("wan_ip", ""),
            "gateway_ip": data.get("gateway_ip", ""),
            "status": data.get("status", ""),
        }
