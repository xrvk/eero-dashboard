from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException

from eero import EeroClient

COOKIE_FILE = str(Path(__file__).resolve().parent.parent / ".eero_session")

_client: EeroClient | None = None


def _make_client() -> EeroClient:
    return EeroClient(cookie_file=COOKIE_FILE, use_keyring=False)


async def ensure_client() -> EeroClient:
    global _client
    if _client is None:
        _client = _make_client()
        await _client.__aenter__()
    return _client


async def get_client() -> EeroClient:
    client = await ensure_client()
    if not client.is_authenticated:
        raise HTTPException(status_code=401, detail="Not authenticated. Please login first.")
    return client


def is_authenticated() -> bool:
    return _client is not None and _client.is_authenticated


async def close_client() -> None:
    global _client
    if _client:
        await _client.__aexit__(None, None, None)
        _client = None


async def reset_client() -> EeroClient:
    await close_client()
    return await ensure_client()


@asynccontextmanager
async def lifespan(app: FastAPI):
    await ensure_client()
    yield
    await close_client()
