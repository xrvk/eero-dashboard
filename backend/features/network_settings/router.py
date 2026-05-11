from fastapi import APIRouter, Depends

from eero import EeroClient

from core.client import get_client

from . import schemas, service

router = APIRouter(prefix="/api", tags=["network_settings"])


# ── Wi-Fi Password ──────────────────────────────────────────────────────────

@router.get("/networks/{network_id}/password")
async def get_password(network_id: str, client: EeroClient = Depends(get_client)):
    return await service.get_password(client, network_id)


# ── Network Name ────────────────────────────────────────────────────────────

@router.post("/networks/{network_id}/name")
async def set_network_name(network_id: str, req: schemas.NetworkNameRequest, client: EeroClient = Depends(get_client)):
    return await service.set_network_name(client, network_id, req.name)


# ── Guest Network ───────────────────────────────────────────────────────────

@router.post("/networks/{network_id}/guest")
async def set_guest_network(network_id: str, req: schemas.GuestNetworkRequest, client: EeroClient = Depends(get_client)):
    return await service.set_guest_network(client, network_id, req.enabled, req.name, req.password)


# ── SQM / QoS ──────────────────────────────────────────────────────────────

@router.get("/networks/{network_id}/sqm")
async def get_sqm(network_id: str, client: EeroClient = Depends(get_client)):
    return await service.get_sqm(client, network_id)


@router.post("/networks/{network_id}/sqm")
async def set_sqm_enabled(network_id: str, req: schemas.SqmEnabledRequest, client: EeroClient = Depends(get_client)):
    return await service.set_sqm_enabled(client, network_id, req.enabled)


@router.post("/networks/{network_id}/sqm/configure")
async def configure_sqm(network_id: str, req: schemas.SqmConfigureRequest, client: EeroClient = Depends(get_client)):
    return await service.configure_sqm(client, network_id, req.enabled, req.upload_mbps, req.download_mbps)


@router.post("/networks/{network_id}/sqm/auto")
async def set_sqm_auto(network_id: str, client: EeroClient = Depends(get_client)):
    return await service.set_sqm_auto(client, network_id)


# ── Firmware Updates ────────────────────────────────────────────────────────

@router.get("/networks/{network_id}/updates")
async def get_updates(network_id: str, client: EeroClient = Depends(get_client)):
    return await service.get_updates(client, network_id)


# ── Network Reboot ──────────────────────────────────────────────────────────

@router.post("/networks/{network_id}/reboot")
async def reboot_network(network_id: str, client: EeroClient = Depends(get_client)):
    return await service.reboot_network(client, network_id)


# ── Thread / Smart Home ────────────────────────────────────────────────────

@router.get("/networks/{network_id}/thread")
async def get_thread(network_id: str, client: EeroClient = Depends(get_client)):
    return await service.get_thread(client, network_id)


@router.get("/networks/{network_id}/routing")
async def get_routing(network_id: str, client: EeroClient = Depends(get_client)):
    return await service.get_routing(client, network_id)


# ── Device Blacklist ────────────────────────────────────────────────────────

@router.get("/networks/{network_id}/blacklist")
async def get_blacklist(network_id: str, client: EeroClient = Depends(get_client)):
    return await service.get_blacklist(client, network_id)


@router.post("/networks/{network_id}/blacklist/{device_id}")
async def add_to_blacklist(network_id: str, device_id: str, client: EeroClient = Depends(get_client)):
    return await service.add_to_blacklist(client, network_id, device_id)


@router.delete("/networks/{network_id}/blacklist/{device_id}")
async def remove_from_blacklist(network_id: str, device_id: str, client: EeroClient = Depends(get_client)):
    return await service.remove_from_blacklist(client, network_id, device_id)
