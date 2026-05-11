from pydantic import BaseModel


class DevicePauseRequest(BaseModel):
    paused: bool


class DeviceBlockRequest(BaseModel):
    blocked: bool


class DeviceNameRequest(BaseModel):
    nickname: str


class DevicePriorityRequest(BaseModel):
    prioritized: bool
    duration_minutes: int | None = None
