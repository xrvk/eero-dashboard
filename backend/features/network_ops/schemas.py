from pydantic import BaseModel


class DnsModeRequest(BaseModel):
    mode: str
    custom_servers: list[str] | None = None


class DnsCachingRequest(BaseModel):
    enabled: bool
