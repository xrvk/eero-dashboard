from fastapi import APIRouter, Depends

from eero import EeroClient

from core.client import get_client

from . import schemas, service

router = APIRouter(prefix="/api", tags=["eero_nodes"])


@router.get("/networks/{network_id}/eeros/{eero_id}")
async def get_eero_detail(network_id: str, eero_id: str, client: EeroClient = Depends(get_client)):
    return await service.get_eero_detail(client, network_id, eero_id)


@router.post("/networks/{network_id}/eeros/{eero_id}/reboot")
async def reboot_eero(network_id: str, eero_id: str, client: EeroClient = Depends(get_client)):
    return await service.reboot_eero(client, network_id, eero_id)


@router.get("/networks/{network_id}/eeros/{eero_id}/led")
async def get_led_status(network_id: str, eero_id: str, client: EeroClient = Depends(get_client)):
    return await service.get_led_status(client, network_id, eero_id)


@router.post("/networks/{network_id}/eeros/{eero_id}/led")
async def set_led(network_id: str, eero_id: str, req: schemas.LedRequest, client: EeroClient = Depends(get_client)):
    return await service.set_led(client, network_id, eero_id, req.enabled)


@router.post("/networks/{network_id}/eeros/{eero_id}/led/brightness")
async def set_led_brightness(network_id: str, eero_id: str, req: schemas.LedBrightnessRequest, client: EeroClient = Depends(get_client)):
    return await service.set_led_brightness(client, network_id, eero_id, req.brightness)


@router.get("/networks/{network_id}/eeros/{eero_id}/nightlight")
async def get_nightlight(network_id: str, eero_id: str, client: EeroClient = Depends(get_client)):
    return await service.get_nightlight(client, network_id, eero_id)


@router.post("/networks/{network_id}/eeros/{eero_id}/nightlight")
async def set_nightlight(network_id: str, eero_id: str, req: schemas.NightlightRequest, client: EeroClient = Depends(get_client)):
    kwargs: dict = {}
    for field in ["enabled", "brightness", "schedule_enabled", "schedule_on", "schedule_off", "ambient_light_enabled"]:
        val = getattr(req, field)
        if val is not None:
            kwargs[field] = val
    return await service.set_nightlight(client, network_id, eero_id, **kwargs)
