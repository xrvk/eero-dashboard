from fastapi import APIRouter

from . import schemas, service

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.get("/status")
async def auth_status():
    return await service.auth_status()


@router.post("/login")
async def login(req: schemas.LoginRequest):
    return await service.login(req.identifier)


@router.post("/verify")
async def verify(req: schemas.VerifyRequest):
    return await service.verify(req.code)


@router.post("/logout")
async def logout():
    return await service.logout()
