"""Tests for device service cache invalidation.

Verifies that every write operation in devices/service.py properly
invalidates the relevant cache keys so stale data is never served.
"""

import unittest
import asyncio
import sys
from pathlib import Path
from unittest.mock import AsyncMock

sys.path.append(str(Path(__file__).resolve().parents[1]))

from core import cache
from core.cache import keys
from features.devices import service


def run(coro):
    return asyncio.get_event_loop().run_until_complete(coro)


def make_mock_client():
    client = AsyncMock()
    client.pause_device.return_value = {"data": {"paused": True}}
    client.block_device.return_value = {"data": {"blocked": True}}
    client.set_device_nickname.return_value = {"data": {"nickname": "new"}}
    client.set_device_priority.return_value = {"data": {"prioritized": True}}
    # Upstream eero-api client cache
    client._cache = {"profiles": {}, "devices": {}, "eeros": {}, "network": {}}
    cache.set_client(client)
    return client


NETWORK = "net123"
DEVICE = "dev456"


class TestDeviceCacheInvalidation(unittest.TestCase):
    """Every write operation must invalidate the device list cache."""

    def setUp(self):
        cache.clear()
        self.client = make_mock_client()

    def _seed_caches(self):
        cache.put(keys.device_list(NETWORK), {"devices": [{"mac": "aa"}]})
        cache.put(keys.device(NETWORK, DEVICE), {"mac": "aa"})
        cache.put(keys.device_sub(NETWORK, DEVICE, "priority"), {"prioritized": False})

    def _assert_list_invalidated(self):
        self.assertIsNone(
            cache.get(keys.device_list(NETWORK)),
            "Device list cache should be invalidated after write",
        )

    def _assert_detail_invalidated(self):
        self.assertIsNone(
            cache.get(keys.device(NETWORK, DEVICE)),
            "Device detail cache should be invalidated after write",
        )

    def test_pause_device_invalidates_list_and_detail(self):
        self._seed_caches()
        run(service.pause_device(self.client, NETWORK, DEVICE, True))
        self._assert_list_invalidated()
        self._assert_detail_invalidated()

    def test_block_device_invalidates_list_and_detail(self):
        self._seed_caches()
        run(service.block_device(self.client, NETWORK, DEVICE, True))
        self._assert_list_invalidated()
        self._assert_detail_invalidated()

    def test_set_nickname_invalidates_list_and_detail(self):
        self._seed_caches()
        run(service.set_device_nickname(self.client, NETWORK, DEVICE, "new"))
        self._assert_list_invalidated()
        self._assert_detail_invalidated()

    def test_set_priority_invalidates_detail_and_list(self):
        self._seed_caches()
        run(service.set_device_priority(self.client, NETWORK, DEVICE, True, None))
        self._assert_detail_invalidated()
        self._assert_list_invalidated()
        self.assertIsNone(cache.get(keys.device_sub(NETWORK, DEVICE, "priority")))

    def test_list_cache_key_starts_with_device_prefix(self):
        """List cache key must be under the device prefix
        so broad invalidations clear it."""
        list_key = keys.device_list(NETWORK)
        prefix = keys.device_prefix(NETWORK)
        self.assertTrue(
            list_key.startswith(prefix),
            f"List cache key '{list_key}' must start with '{prefix}'",
        )


if __name__ == "__main__":
    unittest.main()
