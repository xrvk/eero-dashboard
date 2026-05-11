from pydantic import BaseModel


class NetworkNameRequest(BaseModel):
    name: str


class GuestNetworkRequest(BaseModel):
    enabled: bool
    name: str | None = None
    password: str | None = None


class SqmEnabledRequest(BaseModel):
    enabled: bool


class SqmConfigureRequest(BaseModel):
    enabled: bool
    upload_mbps: int | None = None
    download_mbps: int | None = None
