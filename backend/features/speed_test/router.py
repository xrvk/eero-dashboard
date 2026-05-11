from fastapi import APIRouter, Depends

from eero import EeroClient

from core.client import get_client
from core.errors import translate_errors

from . import service

router = APIRouter(prefix="/api", tags=["speed_test"])


@router.post("/networks/{network_id}/speed-test")
async def run_speed_test(network_id: str, client: EeroClient = Depends(get_client)):
    with translate_errors(code="speed_test_failed", message="Speed test failed"):
        return await service.run_speed_test(client, network_id)


@router.get("/networks/{network_id}/speed-history")
async def get_speed_history(network_id: str):
    return await service.get_speed_history(network_id)
