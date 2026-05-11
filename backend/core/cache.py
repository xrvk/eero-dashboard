"""Simple in-memory TTL cache for eero API responses."""

import time
from typing import Any, Awaitable, Callable

DEFAULT_TTL = 300  # seconds (5 minutes)

_store: dict[str, tuple[float, Any]] = {}


# ── Key helpers ──────────────────────────────────────────────────────────────
# All cache keys for a resource share a common prefix so that
# `invalidate(prefix)` clears the list, detail, and sub-resource keys
# in one call.  The convention:
#
#   net:{network_id}:{resource}:list          — list endpoint
#   net:{network_id}:{resource}:{id}          — detail endpoint
#   net:{network_id}:{resource}:{id}:{sub}    — sub-resource
#
# Example:
#   keys.profile_list("123")           → "net:123:profile:list"
#   keys.profile("123", "p1")          → "net:123:profile:p1"
#   keys.profile_sub("123", "p1", "s") → "net:123:profile:p1:s"
#   invalidate(keys.profile_prefix("123")) clears all of the above.

class keys:
    """Centralized cache key generators."""

    # ── profiles ──
    @staticmethod
    def profile_prefix(network_id: str) -> str:
        return f"net:{network_id}:profile"

    @staticmethod
    def profile_list(network_id: str) -> str:
        return f"net:{network_id}:profile:list"

    @staticmethod
    def profile(network_id: str, profile_id: str) -> str:
        return f"net:{network_id}:profile:{profile_id}"

    @staticmethod
    def profile_sub(network_id: str, profile_id: str, sub: str) -> str:
        return f"net:{network_id}:profile:{profile_id}:{sub}"

    # ── devices ──
    @staticmethod
    def device_prefix(network_id: str) -> str:
        return f"net:{network_id}:device"

    @staticmethod
    def device_list(network_id: str) -> str:
        return f"net:{network_id}:device:list"

    @staticmethod
    def device(network_id: str, device_id: str) -> str:
        return f"net:{network_id}:device:{device_id}"

    @staticmethod
    def device_sub(network_id: str, device_id: str, sub: str) -> str:
        return f"net:{network_id}:device:{device_id}:{sub}"


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
