from fastapi import APIRouter, Depends

from eero import EeroClient

from core.client import get_client

from . import schemas, service

router = APIRouter(prefix="/api", tags=["devices"])


@router.get("/networks/{network_id}/devices")
async def list_devices(network_id: str, client: EeroClient = Depends(get_client)):
    return await service.list_devices(client, network_id)


@router.post("/networks/{network_id}/devices/{device_id}/pause")
async def pause_device(
    network_id: str,
    device_id: str,
    req: schemas.DevicePauseRequest,
    client: EeroClient = Depends(get_client),
):
    return await service.pause_device(client, network_id, device_id, req.paused)


@router.post("/networks/{network_id}/devices/{device_id}/block")
async def block_device(
    network_id: str,
    device_id: str,
    req: schemas.DeviceBlockRequest,
    client: EeroClient = Depends(get_client),
):
    return await service.block_device(client, network_id, device_id, req.blocked)


@router.post("/networks/{network_id}/devices/{device_id}/rename")
async def rename_device(
    network_id: str,
    device_id: str,
    req: schemas.DeviceNameRequest,
    client: EeroClient = Depends(get_client),
):
    return await service.set_device_nickname(client, network_id, device_id, req.nickname)


@router.get("/networks/{network_id}/devices/{device_id}")
async def get_device(network_id: str, device_id: str, client: EeroClient = Depends(get_client)):
    return await service.get_device(client, network_id, device_id)


@router.post("/networks/{network_id}/devices/{device_id}/nickname")
async def set_device_nickname(
    network_id: str,
    device_id: str,
    req: schemas.DeviceNameRequest,
    client: EeroClient = Depends(get_client),
):
    return await service.set_device_nickname(client, network_id, device_id, req.nickname)


@router.get("/networks/{network_id}/devices/{device_id}/priority")
async def get_device_priority(network_id: str, device_id: str, client: EeroClient = Depends(get_client)):
    return await service.get_device_priority(client, network_id, device_id)


@router.post("/networks/{network_id}/devices/{device_id}/priority")
async def set_device_priority(
    network_id: str,
    device_id: str,
    req: schemas.DevicePriorityRequest,
    client: EeroClient = Depends(get_client),
):
    return await service.set_device_priority(
        client,
        network_id,
        device_id,
        req.prioritized,
        req.duration_minutes,
    )
