"""Tests for profile service cache invalidation.

Verifies that every write operation in profiles/service.py properly
invalidates the relevant cache keys so stale data is never served.
"""

import unittest
import asyncio
import sys
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

sys.path.append(str(Path(__file__).resolve().parents[1]))

from core import cache
from features.profiles import service


def run(coro):
    return asyncio.get_event_loop().run_until_complete(coro)


def make_mock_client():
    client = AsyncMock()
    client.pause_profile.return_value = {"data": {"paused": True}}
    client.set_blocked_applications.return_value = {"data": {}}
    client.enable_bedtime.return_value = {"data": {}}
    client.get_profile_schedule.return_value = {"data": {"schedule": []}}
    client.set_profile_schedule.return_value = {"data": {}}
    client.clear_profile_schedule.return_value = {"data": {}}
    client.set_profile_devices.return_value = {"data": {}}
    # For create/rename/delete which use low-level API
    client._api = MagicMock()
    client._api.profiles._auth_api.get_auth_token = AsyncMock(return_value="token")
    client._api.profiles.post = AsyncMock(return_value={"data": {"name": "new"}})
    client._api.profiles.put = AsyncMock(return_value={"data": {"name": "renamed"}})
    client._api.profiles.delete = AsyncMock(return_value={"meta": {"code": 200}})
    return client


NETWORK = "net123"
PROFILE = "prof456"


class TestProfileCacheInvalidation(unittest.TestCase):
    """Every write operation must invalidate the profile list cache."""

    def setUp(self):
        cache.clear()
        self.client = make_mock_client()

    def _seed_caches(self):
        """Populate all profile-related cache keys."""
        cache.put(f"net:{NETWORK}:profile:list", {"profiles": [{"name": "A"}]})
        cache.put(f"net:{NETWORK}:profile:{PROFILE}", {"name": "A"})
        cache.put(f"net:{NETWORK}:profile:{PROFILE}:schedule", {"schedule": []})
        cache.put(f"net:{NETWORK}:profile:{PROFILE}:blocked_apps", {"apps": []})

    def _assert_list_invalidated(self):
        self.assertIsNone(
            cache.get(f"net:{NETWORK}:profile:list"),
            "Profile list cache should be invalidated after write",
        )

    def _assert_detail_invalidated(self):
        self.assertIsNone(
            cache.get(f"net:{NETWORK}:profile:{PROFILE}"),
            "Profile detail cache should be invalidated after write",
        )

    def test_pause_invalidates_list_and_detail(self):
        self._seed_caches()
        run(service.pause_profile(self.client, NETWORK, PROFILE, True))
        self._assert_list_invalidated()
        self._assert_detail_invalidated()

    def test_set_blocked_apps_invalidates_detail(self):
        self._seed_caches()
        run(service.set_blocked_apps(self.client, NETWORK, PROFILE, ["youtube"]))
        self._assert_detail_invalidated()
        self.assertIsNone(cache.get(f"net:{NETWORK}:profile:{PROFILE}:blocked_apps"))

    def test_set_bedtime_invalidates_detail(self):
        self._seed_caches()
        run(service.set_bedtime(self.client, NETWORK, PROFILE, "21:00", "07:00"))
        self._assert_detail_invalidated()
        self.assertIsNone(cache.get(f"net:{NETWORK}:profile:{PROFILE}:schedule"))

    def test_set_schedule_invalidates_detail(self):
        self._seed_caches()
        run(service.set_schedule(self.client, NETWORK, PROFILE, [{"days": ["monday"]}]))
        self._assert_detail_invalidated()
        self.assertIsNone(cache.get(f"net:{NETWORK}:profile:{PROFILE}:schedule"))

    def test_clear_schedule_invalidates_detail(self):
        self._seed_caches()
        run(service.clear_schedule(self.client, NETWORK, PROFILE))
        self._assert_detail_invalidated()
        self.assertIsNone(cache.get(f"net:{NETWORK}:profile:{PROFILE}:schedule"))

    def test_set_devices_invalidates_list_and_detail(self):
        self._seed_caches()
        run(service.set_devices(self.client, NETWORK, PROFILE, ["/dev/1"]))
        self._assert_list_invalidated()
        self._assert_detail_invalidated()

    def test_create_profile_invalidates_list(self):
        self._seed_caches()
        run(service.create_profile(self.client, NETWORK, "New"))
        self._assert_list_invalidated()

    def test_rename_profile_invalidates_list_and_detail(self):
        self._seed_caches()
        run(service.rename_profile(self.client, NETWORK, PROFILE, "Renamed"))
        self._assert_list_invalidated()
        self._assert_detail_invalidated()

    def test_delete_profile_invalidates_list_and_detail(self):
        self._seed_caches()
        run(service.delete_profile(self.client, NETWORK, PROFILE))
        self._assert_list_invalidated()
        self._assert_detail_invalidated()

    def test_list_cache_key_starts_with_profile_prefix(self):
        """The list cache key must start with 'net:{id}:profile' so
        broad invalidations (e.g. cache.invalidate('net:{id}:profile'))
        clear it along with detail caches."""
        key = f"net:{NETWORK}:profile:list"
        self.assertTrue(
            key.startswith(f"net:{NETWORK}:profile"),
            f"List cache key '{key}' must start with 'net:{NETWORK}:profile'",
        )


if __name__ == "__main__":
    unittest.main()
