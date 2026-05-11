from pydantic import BaseModel


class DevicePauseRequest(BaseModel):
    paused: bool


class DeviceBlockRequest(BaseModel):
    blocked: bool


class DeviceRenameRequest(BaseModel):
    nickname: str


class DeviceNicknameRequest(BaseModel):
    nickname: str


class DevicePriorityRequest(BaseModel):
    prioritized: bool
    duration_minutes: int | None = None
