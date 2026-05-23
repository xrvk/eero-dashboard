"""Tests for demo mode (EERO_DEMO_DATA flag + middleware)."""

import os
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.append(str(Path(__file__).resolve().parents[1]))

import core.demo as demo_module
from core import demo_data
from fastapi.testclient import TestClient


class DemoFlagTests(unittest.TestCase):
    def setUp(self):
        demo_module._DEMO_MODE = None

    def tearDown(self):
        demo_module._DEMO_MODE = None

    @patch.dict(os.environ, {"EERO_DEMO_DATA": "true"})
    def test_enabled_with_true(self):
        self.assertTrue(demo_module.is_demo_mode())

    @patch.dict(os.environ, {"EERO_DEMO_DATA": "1"})
    def test_enabled_with_one(self):
        self.assertTrue(demo_module.is_demo_mode())

    @patch.dict(os.environ, {"EERO_DEMO_DATA": "YES"})
    def test_enabled_case_insensitive(self):
        self.assertTrue(demo_module.is_demo_mode())

    @patch.dict(os.environ, {"EERO_DEMO_DATA": "false"})
    def test_disabled_with_false(self):
        self.assertFalse(demo_module.is_demo_mode())

    @patch.dict(os.environ, {}, clear=True)
    def test_disabled_by_default(self):
        self.assertFalse(demo_module.is_demo_mode())

    @patch.dict(os.environ, {"EERO_DEMO_DATA": "true"})
    def test_caches_after_first_read(self):
        self.assertTrue(demo_module.is_demo_mode())
        with patch.dict(os.environ, {"EERO_DEMO_DATA": "false"}):
            # cached — toggle requires reset
            self.assertTrue(demo_module.is_demo_mode())


class DemoMiddlewareTests(unittest.TestCase):
    """Integration tests against the real FastAPI app."""

    @classmethod
    def setUpClass(cls):
        os.environ["EERO_DEMO_DATA"] = "true"
        demo_module._DEMO_MODE = None
        # Import lazily so the flag is in place before main constructs the app
        from main import app
        cls.client = TestClient(app)

    @classmethod
    def tearDownClass(cls):
        os.environ.pop("EERO_DEMO_DATA", None)
        demo_module._DEMO_MODE = None

    def test_auth_status_is_authenticated(self):
        r = self.client.get("/api/auth/status")
        self.assertEqual(r.status_code, 200)
        body = r.json()
        self.assertTrue(body["authenticated"])
        self.assertTrue(body["demo"])
        self.assertEqual(body["name"], "Demo User")

    def test_networks_returns_demo_network(self):
        r = self.client.get("/api/networks")
        self.assertEqual(r.status_code, 200)
        nets = r.json()["networks"]
        self.assertEqual(len(nets), 1)
        self.assertEqual(nets[0]["url"], f"/2.2/networks/{demo_data.NETWORK_ID}")

    def test_devices_returns_demo_devices(self):
        r = self.client.get(f"/api/networks/{demo_data.NETWORK_ID}/devices")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(r.json()["devices"]), len(demo_data.DEVICES))

    def test_device_lookup_by_id(self):
        device_id = demo_data.DEVICES[3]["url"].rsplit("/", 1)[-1]
        r = self.client.get(f"/api/networks/{demo_data.NETWORK_ID}/devices/{device_id}")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["display_name"], demo_data.DEVICES[3]["display_name"])

    def test_speed_history_uses_demo_seed(self):
        r = self.client.get(f"/api/networks/{demo_data.NETWORK_ID}/speed-history")
        self.assertEqual(r.status_code, 200)
        body = r.json()
        self.assertEqual(len(body["history"]), 14)
        for entry in body["history"]:
            self.assertEqual(entry["network_id"], demo_data.NETWORK_ID)

    def test_mutation_returns_demo_noop(self):
        r = self.client.put(
            f"/api/networks/{demo_data.NETWORK_ID}/settings",
            json={"name": "anything"},
        )
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.json().get("_demo"))

    def test_health_passes_through_and_reports_demo(self):
        r = self.client.get("/api/health")
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.json()["demo_mode"])


class DemoOffTests(unittest.TestCase):
    """Confirm middleware is a no-op when the flag is off."""

    @classmethod
    def setUpClass(cls):
        os.environ.pop("EERO_DEMO_DATA", None)
        demo_module._DEMO_MODE = None
        from main import app
        cls.client = TestClient(app)

    def test_auth_status_not_authenticated(self):
        # No demo, no real eero login — must NOT report authenticated.
        r = self.client.get("/api/auth/status")
        self.assertEqual(r.status_code, 200)
        body = r.json()
        self.assertFalse(body.get("authenticated"))
        self.assertFalse(body.get("demo"))

    def test_health_reports_demo_off(self):
        r = self.client.get("/api/health")
        self.assertEqual(r.status_code, 200)
        self.assertFalse(r.json()["demo_mode"])


if __name__ == "__main__":
    unittest.main()
