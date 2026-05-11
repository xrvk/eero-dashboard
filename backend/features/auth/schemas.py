from pydantic import BaseModel


class LoginRequest(BaseModel):
    identifier: str


class VerifyRequest(BaseModel):
    code: str
