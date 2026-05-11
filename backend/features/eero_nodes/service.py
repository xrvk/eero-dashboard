from eero import EeroClient

from core import cache
from core.errors import translate_errors


async def get_eero_detail(client: EeroClient, network_id: str, eero_id: str):
    with translate_errors(code="get_eero_failed", message="Failed to fetch eero detail"):
        resp = await client.get_eero(eero_id, network_id=network_id)
        return resp.get("data", resp)


async def reboot_eero(client: EeroClient, network_id: str, eero_id: str):
    with translate_errors(code="reboot_eero_failed", message="Failed to reboot eero"):
        resp = await client.reboot_eero(eero_id, network_id=network_id)
        cache.invalidate(f"net:{network_id}:eeros")
        cache.clear_upstream("eeros", network_id=network_id)
        return resp.get("data", resp)


async def get_led_status(client: EeroClient, network_id: str, eero_id: str):
    with translate_errors(code="get_led_failed", message="Failed to fetch LED status"):
        resp = await client.get_led_status(eero_id, network_id=network_id)
        data = resp.get("data", resp)
        return {
            "led_on": data.get("led_on", False),
            "brightness": data.get("led_brightness", 100),
        }


async def set_led(client: EeroClient, network_id: str, eero_id: str, enabled: bool):
    with translate_errors(code="set_led_failed", message="Failed to set LED status"):
        resp = await client.set_led(eero_id, enabled, network_id=network_id)
        cache.clear_upstream("eeros", network_id=network_id)
        return resp.get("data", resp)


async def set_led_brightness(client: EeroClient, network_id: str, eero_id: str, brightness: int):
    with translate_errors(code="set_led_brightness_failed", message="Failed to set LED brightness"):
        resp = await client.set_led_brightness(eero_id, brightness, network_id=network_id)
        cache.clear_upstream("eeros", network_id=network_id)
        return resp.get("data", resp)


async def get_nightlight(client: EeroClient, network_id: str, eero_id: str):
    with translate_errors(code="get_nightlight_failed", message="Failed to fetch nightlight"):
        resp = await client.get_nightlight(eero_id, network_id=network_id)
        return resp.get("data", resp)


async def set_nightlight(client: EeroClient, network_id: str, eero_id: str, **kwargs):
    with translate_errors(code="set_nightlight_failed", message="Failed to set nightlight"):
        resp = await client.set_nightlight(eero_id, network_id=network_id, **kwargs)
        cache.clear_upstream("eeros", network_id=network_id)
        return resp.get("data", resp)
