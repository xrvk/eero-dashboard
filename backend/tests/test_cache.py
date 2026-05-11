"""Regression tests for the in-memory TTL cache."""

import asyncio
import time
import unittest
import sys
from pathlib import Path
from unittest.mock import patch

sys.path.append(str(Path(__file__).resolve().parents[1]))

from core import cache


class CacheTests(unittest.TestCase):
    def setUp(self):
        cache.clear()

    def tearDown(self):
        cache.clear()

    def test_put_and_get(self):
        cache.put("key1", {"data": 42})
        self.assertEqual(cache.get("key1"), {"data": 42})

    def test_get_returns_none_for_missing_key(self):
        self.assertIsNone(cache.get("nonexistent"))

    def test_ttl_expiry(self):
        cache.put("key1", "value", ttl=1)
        self.assertEqual(cache.get("key1"), "value")
        # Simulate time passing
        with patch("core.cache.time") as mock_time:
            mock_time.monotonic.return_value = time.monotonic() + 2
            self.assertIsNone(cache.get("key1"))

    def test_invalidate_prefix(self):
        cache.put("net:123:devices", [1, 2])
        cache.put("net:123:security", {"wpa3": True})
        cache.put("net:456:devices", [3, 4])

        cache.invalidate("net:123:")

        self.assertIsNone(cache.get("net:123:devices"))
        self.assertIsNone(cache.get("net:123:security"))
        self.assertEqual(cache.get("net:456:devices"), [3, 4])

    def test_invalidate_network(self):
        cache.put("net:123:devices", [1])
        cache.put("net:123:dns", {"mode": "auto"})
        cache.put("net:999:devices", [2])

        cache.invalidate_network("123")

        self.assertIsNone(cache.get("net:123:devices"))
        self.assertIsNone(cache.get("net:123:dns"))
        self.assertEqual(cache.get("net:999:devices"), [2])

    def test_clear(self):
        cache.put("a", 1)
        cache.put("b", 2)
        cache.clear()
        self.assertIsNone(cache.get("a"))
        self.assertIsNone(cache.get("b"))

    def test_cached_returns_from_cache_on_hit(self):
        cache.put("key1", "cached_value")
        call_count = 0

        async def factory():
            nonlocal call_count
            call_count += 1
            return "fresh_value"

        result = asyncio.get_event_loop().run_until_complete(cache.cached("key1", factory))
        self.assertEqual(result, "cached_value")
        self.assertEqual(call_count, 0)

    def test_cached_calls_factory_on_miss(self):
        call_count = 0

        async def factory():
            nonlocal call_count
            call_count += 1
            return "fresh_value"

        result = asyncio.get_event_loop().run_until_complete(cache.cached("miss_key", factory))
        self.assertEqual(result, "fresh_value")
        self.assertEqual(call_count, 1)
        # Should now be cached
        self.assertEqual(cache.get("miss_key"), "fresh_value")

    def test_cached_stores_with_custom_ttl(self):
        async def factory():
            return "value"

        asyncio.get_event_loop().run_until_complete(cache.cached("ttl_key", factory, ttl=600))
        self.assertEqual(cache.get("ttl_key"), "value")

    def test_mutations_invalidate_cache(self):
        """Simulate the pattern: cache data, then mutate and invalidate."""
        cache.put("net:1:devices", [{"mac": "aa:bb"}])
        cache.put("net:1:device:aa:bb", {"name": "iPhone"})

        # After a mutation (e.g. rename), invalidate device entries
        cache.invalidate("net:1:device")

        self.assertIsNone(cache.get("net:1:devices"))
        self.assertIsNone(cache.get("net:1:device:aa:bb"))


if __name__ == "__main__":
    unittest.main()
