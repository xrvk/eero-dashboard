"""Tests for dry-run mode (core/dry_run.py + facade integration)."""

import os
import sys
import unittest
from pathlib import Path
from unittest.mock import AsyncMock, patch

sys.path.append(str(Path(__file__).resolve().parents[1]))

import core.dry_run as dry_run_module
from core.dry_run import block_unmocked_mutation, mock_endpoint_response, mock_settings_response


class DryRunFlagTests(unittest.TestCase):
    """Test that is_dry_run() reads EERO_DRY_RUN correctly."""

    def setUp(self):
        dry_run_module._DRY_RUN = None

    def tearDown(self):
        dry_run_module._DRY_RUN = None

    @patch.dict(os.environ, {"EERO_DRY_RUN": "true"})
    def test_enabled_with_true(self):
        self.assertTrue(dry_run_module.is_dry_run())

    @patch.dict(os.environ, {"EERO_DRY_RUN": "1"})
    def test_enabled_with_one(self):
        self.assertTrue(dry_run_module.is_dry_run())

    @patch.dict(os.environ, {"EERO_DRY_RUN": "yes"})
    def test_enabled_with_yes(self):
        self.assertTrue(dry_run_module.is_dry_run())

    @patch.dict(os.environ, {"EERO_DRY_RUN": "TRUE"})
    def test_enabled_case_insensitive(self):
        self.assertTrue(dry_run_module.is_dry_run())

    @patch.dict(os.environ, {"EERO_DRY_RUN": "false"})
    def test_disabled_with_false(self):
        self.assertFalse(dry_run_module.is_dry_run())

    @patch.dict(os.environ, {}, clear=True)
    def test_disabled_when_unset(self):
        os.environ.pop("EERO_DRY_RUN", None)
        self.assertFalse(dry_run_module.is_dry_run())

    @patch.dict(os.environ, {"EERO_DRY_RUN": "true"})
    def test_cached_after_first_call(self):
        self.assertTrue(dry_run_module.is_dry_run())
        # Mutate env — should still return cached value
        os.environ["EERO_DRY_RUN"] = "false"
        self.assertTrue(dry_run_module.is_dry_run())


class MockResponseTests(unittest.TestCase):
    """Test mock response builders."""

    def test_mock_settings_response_echoes_payload(self):
        result = mock_settings_response("net123", {"sqm": True})
        self.assertEqual(result["data"]["sqm"], True)
        self.assertTrue(result["data"]["_dry_run"])

    def test_mock_settings_response_preserves_nested_payload(self):
        payload = {"dns": {"mode": "custom", "custom": {"ips": ["1.1.1.1"]}}}
        result = mock_settings_response("net123", payload)
        self.assertEqual(result["data"]["dns"]["mode"], "custom")

    def test_mock_endpoint_response_with_payload(self):
        result = mock_endpoint_response("PUT", "devices/d1", {"paused": True})
        self.assertEqual(result["data"]["paused"], True)
        self.assertTrue(result["data"]["_dry_run"])

    def test_mock_endpoint_response_without_payload(self):
        result = mock_endpoint_response("DELETE", "profiles/p1")
        self.assertTrue(result["data"]["_dry_run"])


class BlockUnmockedTests(unittest.TestCase):
    """Test that unmocked mutations raise HTTPException 403."""

    def test_raises_http_403(self):
        from fastapi import HTTPException

        with self.assertRaises(HTTPException) as ctx:
            block_unmocked_mutation("reboot_network")
        self.assertEqual(ctx.exception.status_code, 403)
        self.assertIn("reboot_network", ctx.exception.detail["message"])
        self.assertEqual(ctx.exception.detail["code"], "dry_run_blocked")


class ServiceDryRunIntegrationTests(unittest.TestCase):
    """Test that service mutations respect dry-run mode."""

    def setUp(self):
        dry_run_module._DRY_RUN = None

    def tearDown(self):
        dry_run_module._DRY_RUN = None

    @patch.dict(os.environ, {"EERO_DRY_RUN": "true"})
    def test_pause_device_blocked(self):
        import asyncio
        from fastapi import HTTPException
        from features.devices import service as device_service

        client = AsyncMock()
        with self.assertRaises(HTTPException) as ctx:
            asyncio.get_event_loop().run_until_complete(
                device_service.pause_device(client, "net1", "dev1", True)
            )
        self.assertEqual(ctx.exception.status_code, 403)

    @patch.dict(os.environ, {"EERO_DRY_RUN": "true"})
    def test_set_guest_network_blocked(self):
        import asyncio
        from fastapi import HTTPException
        from features.network_settings import service as ns_service

        client = AsyncMock()
        with self.assertRaises(HTTPException) as ctx:
            asyncio.get_event_loop().run_until_complete(
                ns_service.set_guest_network(client, "net1", True, None, None)
            )
        self.assertEqual(ctx.exception.status_code, 403)

    @patch.dict(os.environ, {"EERO_DRY_RUN": "true"})
    def test_create_profile_blocked(self):
        import asyncio
        from fastapi import HTTPException
        from features.profiles import service as profile_service

        client = AsyncMock()
        with self.assertRaises(HTTPException) as ctx:
            asyncio.get_event_loop().run_until_complete(
                profile_service.create_profile(client, "net1", "Kid")
            )
        self.assertEqual(ctx.exception.status_code, 403)


if __name__ == "__main__":
    unittest.main()
