from fastapi import APIRouter, Depends

from eero import EeroClient

from core.client import get_client

from . import schemas, service

router = APIRouter(prefix="/api", tags=["security"])


@router.get("/networks/{network_id}/security")
async def get_security(network_id: str, client: EeroClient = Depends(get_client)):
    return await service.get_security(client, network_id)


@router.patch("/networks/{network_id}/security")
async def update_security(network_id: str, req: schemas.SecurityUpdateRequest, client: EeroClient = Depends(get_client)):
    kwargs: dict = {}
    for field in ["wpa3", "band_steering", "upnp", "ipv6", "thread"]:
        val = getattr(req, field)
        if val is not None:
            kwargs[field] = val
    return await service.update_security(client, network_id, **kwargs)
