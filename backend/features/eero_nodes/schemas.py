from pydantic import BaseModel


class LedRequest(BaseModel):
    enabled: bool


class LedBrightnessRequest(BaseModel):
    brightness: int


class NightlightRequest(BaseModel):
    enabled: bool | None = None
    brightness: int | None = None
    schedule_enabled: bool | None = None
    schedule_on: str | None = None
    schedule_off: str | None = None
    ambient_light_enabled: bool | None = None
