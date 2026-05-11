from fastapi import APIRouter, Depends

from eero import EeroClient

from core.client import get_client

from . import schemas, service

router = APIRouter(prefix="/api", tags=["port_forwards"])


@router.get("/networks/{network_id}/forwards")
async def get_forwards(network_id: str, client: EeroClient = Depends(get_client)):
    return await service.get_forwards(client, network_id)


@router.post("/networks/{network_id}/forwards")
async def create_forward(network_id: str, req: schemas.CreateForwardRequest, client: EeroClient = Depends(get_client)):
    return await service.create_forward(client, network_id, {
        "ip": req.ip,
        "gateway_port": req.gateway_port,
        "client_port": req.client_port,
        "protocol": req.protocol,
        "description": req.description,
        "enabled": req.enabled,
    })


@router.delete("/networks/{network_id}/forwards/{forward_id}")
async def delete_forward(network_id: str, forward_id: str, client: EeroClient = Depends(get_client)):
    return await service.delete_forward(client, network_id, forward_id)


@router.get("/networks/{network_id}/reservations")
async def get_reservations(network_id: str, client: EeroClient = Depends(get_client)):
    return await service.get_reservations(client, network_id)


@router.post("/networks/{network_id}/reservations")
async def create_reservation(network_id: str, req: schemas.CreateReservationRequest, client: EeroClient = Depends(get_client)):
    return await service.create_reservation(client, network_id, {
        "ip": req.ip,
        "mac": req.mac,
        "description": req.description,
    })


@router.delete("/networks/{network_id}/reservations/{reservation_id}")
async def delete_reservation(network_id: str, reservation_id: str, client: EeroClient = Depends(get_client)):
    return await service.delete_reservation(client, network_id, reservation_id)
