"""Simple in-memory TTL cache for eero API responses."""

import time
from typing import Any, Awaitable, Callable

DEFAULT_TTL = 300  # seconds (5 minutes)

_store: dict[str, tuple[float, Any]] = {}


def get(key: str) -> Any | None:
    entry = _store.get(key)
    if entry is None:
        return None
    expires_at, value = entry
    if time.monotonic() > expires_at:
        del _store[key]
        return None
    return value


def put(key: str, value: Any, ttl: int = DEFAULT_TTL) -> None:
    _store[key] = (time.monotonic() + ttl, value)


def invalidate(prefix: str) -> None:
    """Remove all entries whose key starts with *prefix*."""
    keys = [k for k in _store if k.startswith(prefix)]
    for k in keys:
        del _store[k]


def invalidate_network(network_id: str) -> None:
    """Invalidate all cached data for a specific network."""
    invalidate(f"net:{network_id}:")


def clear() -> None:
    _store.clear()


async def cached(
    key: str,
    factory: Callable[[], Awaitable[Any]],
    ttl: int = DEFAULT_TTL,
) -> Any:
    """Return a cached value or call *factory*, cache, and return it."""
    hit = get(key)
    if hit is not None:
        return hit
    result = await factory()
    put(key, result, ttl)
    return result
