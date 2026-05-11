from fastapi import APIRouter, Depends

from eero import EeroClient

from core.client import get_client

from . import schemas, service

router = APIRouter(prefix="/api", tags=["network-ops"])


@router.post("/prefetch/{network_id}")
async def prefetch(network_id: str, client: EeroClient = Depends(get_client)):
    return await service.prefetch(client, network_id)


@router.get("/networks/{network_id}/dns")
async def get_dns(network_id: str, client: EeroClient = Depends(get_client)):
    return await service.get_dns(client, network_id)


@router.post("/networks/{network_id}/dns/mode")
async def set_dns_mode(
    network_id: str, req: schemas.DnsModeRequest, client: EeroClient = Depends(get_client)
):
    return await service.set_dns_mode(client, network_id, req.mode, req.custom_servers)


@router.post("/networks/{network_id}/dns/caching")
async def set_dns_caching(
    network_id: str, req: schemas.DnsCachingRequest, client: EeroClient = Depends(get_client)
):
    return await service.set_dns_caching(client, network_id, req.enabled)


@router.get("/networks/{network_id}/activity")
async def get_activity(network_id: str, client: EeroClient = Depends(get_client)):
    return await service.get_activity(client, network_id)


@router.get("/networks/{network_id}/activity/history")
async def get_activity_history(
    network_id: str, period: str = "day", client: EeroClient = Depends(get_client)
):
    return await service.get_activity_history(client, network_id, period)


@router.get("/networks/{network_id}/activity/clients")
async def get_activity_clients(network_id: str, client: EeroClient = Depends(get_client)):
    return await service.get_activity_clients(client, network_id)


@router.get("/networks/{network_id}/activity/categories")
async def get_activity_categories(network_id: str, client: EeroClient = Depends(get_client)):
    return await service.get_activity_categories(client, network_id)


@router.get("/networks/{network_id}/diagnostics")
async def get_diagnostics(network_id: str, client: EeroClient = Depends(get_client)):
    return await service.get_diagnostics(client, network_id)


@router.post("/networks/{network_id}/diagnostics")
async def run_diagnostics(network_id: str, client: EeroClient = Depends(get_client)):
    return await service.run_diagnostics(client, network_id)
