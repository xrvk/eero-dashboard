from fastapi import HTTPException

from eero import EeroClient


async def list_devices(client: EeroClient, network_id: str):
    try:
        resp = await client.get_devices(network_id)
        devices = resp.get("data", resp.get("devices", []))
        if isinstance(devices, dict):
            devices = devices.get("devices", [])
        return {"devices": devices}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


async def pause_device(client: EeroClient, network_id: str, device_id: str, paused: bool):
    try:
        resp = await client.pause_device(device_id, paused, network_id=network_id)
        return resp.get("data", resp)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


async def block_device(client: EeroClient, network_id: str, device_id: str, blocked: bool):
    try:
        resp = await client.block_device(device_id, blocked, network_id=network_id)
        return resp.get("data", resp)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


async def get_device(client: EeroClient, network_id: str, device_id: str):
    try:
        resp = await client.get_device(device_id, network_id=network_id)
        return resp.get("data", resp)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


async def set_device_nickname(client: EeroClient, network_id: str, device_id: str, nickname: str):
    try:
        resp = await client.set_device_nickname(device_id, nickname, network_id=network_id)
        return resp.get("data", resp)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


async def get_device_priority(client: EeroClient, network_id: str, device_id: str):
    try:
        resp = await client.get_device_priority(device_id, network_id=network_id)
        return resp.get("data", resp)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


async def set_device_priority(
    client: EeroClient,
    network_id: str,
    device_id: str,
    prioritized: bool,
    duration_minutes: int | None,
):
    try:
        resp = await client.set_device_priority(
            device_id, prioritized, duration_minutes=duration_minutes, network_id=network_id
        )
        return resp.get("data", resp)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
