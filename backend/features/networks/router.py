from fastapi import APIRouter, Depends

from eero import EeroClient

from core.client import get_client

from . import service

router = APIRouter(prefix="/api", tags=["networks"])


@router.get("/networks")
async def list_networks(client: EeroClient = Depends(get_client)):
    return await service.list_networks(client)


@router.get("/networks/{network_id}")
async def get_network(network_id: str, client: EeroClient = Depends(get_client)):
    return await service.get_network(client, network_id)


@router.get("/networks/{network_id}/eeros")
async def list_eeros(network_id: str, client: EeroClient = Depends(get_client)):
    return await service.list_eeros(client, network_id)


@router.get("/networks/{network_id}/settings")
async def get_settings(network_id: str, client: EeroClient = Depends(get_client)):
    return await service.get_settings(client, network_id)
