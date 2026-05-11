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

    # ── networks ──
    @staticmethod
    def networks_list() -> str:
        return "networks"

    @staticmethod
    def network(network_id: str) -> str:
        return f"net:{network_id}:network"

    @staticmethod
    def eeros(network_id: str) -> str:
        return f"net:{network_id}:eeros"

    @staticmethod
    def settings(network_id: str) -> str:
        return f"net:{network_id}:settings"

    @staticmethod
    def password(network_id: str) -> str:
        return f"net:{network_id}:password"

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

    # ── network settings ──
    @staticmethod
    def security(network_id: str) -> str:
        return f"net:{network_id}:security"

    @staticmethod
    def dns(network_id: str) -> str:
        return f"net:{network_id}:dns"

    @staticmethod
    def sqm(network_id: str) -> str:
        return f"net:{network_id}:sqm"

    @staticmethod
    def updates(network_id: str) -> str:
        return f"net:{network_id}:updates"

    @staticmethod
    def thread(network_id: str) -> str:
        return f"net:{network_id}:thread"

    @staticmethod
    def routing(network_id: str) -> str:
        return f"net:{network_id}:routing"

    @staticmethod
    def blacklist(network_id: str) -> str:
        return f"net:{network_id}:blacklist"

    @staticmethod
    def forwards(network_id: str) -> str:
        return f"net:{network_id}:forwards"

    @staticmethod
    def reservations(network_id: str) -> str:
        return f"net:{network_id}:reservations"

    # ── activity & diagnostics ──
    @staticmethod
    def activity(network_id: str) -> str:
        return f"net:{network_id}:activity"

    @staticmethod
    def activity_sub(network_id: str, sub: str) -> str:
        return f"net:{network_id}:activity:{sub}"

    @staticmethod
    def diagnostics(network_id: str) -> str:
        return f"net:{network_id}:diagnostics"


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
    ks = [k for k in _store if k.startswith(prefix)]
    for k in ks:
        del _store[k]


def invalidate_network(network_id: str) -> None:
    """Invalidate all cached data for a specific network (both layers)."""
    invalidate(f"net:{network_id}:")
    clear_upstream("network", "eeros", "devices", "profiles", network_id=network_id)


def clear() -> None:
    _store.clear()


# ── Upstream eero-api client cache ───────────────────────────────────────────
# The eero-api EeroClient maintains its own internal cache keyed by category
# (account, networks, network, eeros, devices, profiles). When our app
# mutates data, we must clear BOTH our app cache AND the upstream client cache
# to prevent stale reads.

_eero_client = None  # set via set_client() during app startup


def set_client(client: Any) -> None:
    """Register the eero client so upstream cache can be cleared."""
    global _eero_client
    _eero_client = client


def clear_upstream(*categories: str, network_id: str | None = None) -> None:
    """Clear the eero-api client's internal cache for given categories.

    Args:
        categories: One or more of "profiles", "devices", "eeros", "network", "networks"
        network_id: If provided, only clear the subkey for this network (where applicable)
    """
    if _eero_client is None:
        return
    upstream = getattr(_eero_client, "_cache", None)
    if upstream is None:
        return
    for cat in categories:
        bucket = upstream.get(cat)
        if bucket is None:
            continue
        if isinstance(bucket, dict) and "data" in bucket:
            # Simple category (e.g. networks, account): reset data
            bucket["data"] = None
            bucket["timestamp"] = 0
        elif isinstance(bucket, dict):
            # Keyed category (e.g. profiles, devices, eeros, network)
            if network_id:
                # Clear entries matching this network
                to_del = [k for k in bucket if k.startswith(network_id)]
                for k in to_del:
                    del bucket[k]
            else:
                bucket.clear()


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
