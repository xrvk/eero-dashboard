from pydantic import BaseModel


class ProfilePauseRequest(BaseModel):
    paused: bool


class ProfileBedtimeRequest(BaseModel):
    start_time: str
    end_time: str
    days: list[str] | None = None


class ProfileBlockedAppsRequest(BaseModel):
    applications: list[str]


class ProfileDevicesRequest(BaseModel):
    device_urls: list[str]


class ProfileScheduleRequest(BaseModel):
    time_blocks: list[dict]


class ProfileCreateRequest(BaseModel):
    name: str


class ProfileRenameRequest(BaseModel):
    name: str
