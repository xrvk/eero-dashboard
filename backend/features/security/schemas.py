from pydantic import BaseModel


class SecurityUpdateRequest(BaseModel):
    wpa3: bool | None = None
    band_steering: bool | None = None
    upnp: bool | None = None
    ipv6: bool | None = None
    thread: bool | None = None
