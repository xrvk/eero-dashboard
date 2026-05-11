from fastapi import APIRouter, Depends

from eero import EeroClient

from core.client import get_client

from . import schemas, service

router = APIRouter(prefix="/api", tags=["profiles"])


@router.get("/networks/{network_id}/profiles")
async def list_profiles(network_id: str, client: EeroClient = Depends(get_client)):
    return await service.list_profiles(client, network_id)


@router.post("/networks/{network_id}/profiles")
async def create_profile(
    network_id: str,
    req: schemas.ProfileCreateRequest,
    client: EeroClient = Depends(get_client),
):
    return await service.create_profile(client, network_id, req.name)


@router.get("/networks/{network_id}/profiles/{profile_id}")
async def get_profile(network_id: str, profile_id: str, client: EeroClient = Depends(get_client)):
    return await service.get_profile(client, network_id, profile_id)


@router.post("/networks/{network_id}/profiles/{profile_id}/pause")
async def pause_profile(
    network_id: str,
    profile_id: str,
    req: schemas.ProfilePauseRequest,
    client: EeroClient = Depends(get_client),
):
    return await service.pause_profile(client, network_id, profile_id, req.paused)


@router.get("/networks/{network_id}/profiles/{profile_id}/blocked-apps")
async def get_blocked_apps(
    network_id: str, profile_id: str, client: EeroClient = Depends(get_client)
):
    return await service.get_blocked_apps(client, network_id, profile_id)


@router.post("/networks/{network_id}/profiles/{profile_id}/blocked-apps")
async def set_blocked_apps(
    network_id: str,
    profile_id: str,
    req: schemas.ProfileBlockedAppsRequest,
    client: EeroClient = Depends(get_client),
):
    return await service.set_blocked_apps(client, network_id, profile_id, req.applications)


@router.post("/networks/{network_id}/profiles/{profile_id}/bedtime")
async def set_bedtime(
    network_id: str,
    profile_id: str,
    req: schemas.ProfileBedtimeRequest,
    client: EeroClient = Depends(get_client),
):
    return await service.set_bedtime(
        client, network_id, profile_id, req.start_time, req.end_time, req.days
    )


@router.get("/networks/{network_id}/profiles/{profile_id}/schedule")
async def get_schedule(
    network_id: str, profile_id: str, client: EeroClient = Depends(get_client)
):
    return await service.get_schedule(client, network_id, profile_id)


@router.post("/networks/{network_id}/profiles/{profile_id}/schedule/set")
async def set_schedule(
    network_id: str,
    profile_id: str,
    req: schemas.ProfileScheduleRequest,
    client: EeroClient = Depends(get_client),
):
    return await service.set_schedule(client, network_id, profile_id, req.time_blocks)


@router.delete("/networks/{network_id}/profiles/{profile_id}/schedule")
async def clear_schedule(
    network_id: str, profile_id: str, client: EeroClient = Depends(get_client)
):
    return await service.clear_schedule(client, network_id, profile_id)


@router.put("/networks/{network_id}/profiles/{profile_id}/devices")
async def set_devices(
    network_id: str,
    profile_id: str,
    req: schemas.ProfileDevicesRequest,
    client: EeroClient = Depends(get_client),
):
    return await service.set_devices(client, network_id, profile_id, req.device_urls)


@router.put("/networks/{network_id}/profiles/{profile_id}/rename")
async def rename_profile(
    network_id: str,
    profile_id: str,
    req: schemas.ProfileRenameRequest,
    client: EeroClient = Depends(get_client),
):
    return await service.rename_profile(client, network_id, profile_id, req.name)


@router.delete("/networks/{network_id}/profiles/{profile_id}")
async def delete_profile(
    network_id: str,
    profile_id: str,
    client: EeroClient = Depends(get_client),
):
    return await service.delete_profile(client, network_id, profile_id)
