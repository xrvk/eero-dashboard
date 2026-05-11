from pydantic import BaseModel


class CreateForwardRequest(BaseModel):
    ip: str
    gateway_port: int
    client_port: int
    protocol: str = "tcp"
    description: str = ""
    enabled: bool = True


class CreateReservationRequest(BaseModel):
    ip: str
    mac: str
    description: str = ""
