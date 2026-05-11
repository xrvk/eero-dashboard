import unittest
import sys
from pathlib import Path
from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

sys.path.append(str(Path(__file__).resolve().parents[1]))

import core.client as core_client
import features.auth.service as auth_service
import features.devices.router as devices_router
import features.networks.router as networks_router
import main


class ApiSmokeTests(unittest.TestCase):
    def setUp(self):
        self.client_mock = AsyncMock()
        self.client_mock.is_authenticated = True
        self.client_mock.get_networks.return_value = {"data": {"networks": [{"id": 1, "name": "Home"}]}}
        self.client_mock.get_network.return_value = {
            "data": {
                "name": "Home",
                "password": "secret",
                "timezone": {"value": "UTC"},
                "speed": {"down": {"value": 500, "units": "Mbps"}},
            }
        }
        self.client_mock.get_devices.return_value = {"data": [{"mac": "aa:bb", "display_name": "iPhone"}]}
        self.client_mock.get_account.return_value = {
            "name": "Test User",
            "email": {"value": "test@example.com"},
        }
        self.client_mock.login.return_value = None
        self.client_mock.verify.return_value = None
        self.client_mock.logout.return_value = None

        async def _fake_get_client():
            return self.client_mock

        self._auth_ensure = patch.object(auth_service, "ensure_client", AsyncMock(return_value=self.client_mock))
        self._auth_reset = patch.object(auth_service, "reset_client", AsyncMock(return_value=self.client_mock))
        self._lifespan_ensure = patch.object(core_client, "ensure_client", AsyncMock(return_value=self.client_mock))
        self._auth_ensure.start()
        self._auth_reset.start()
        self._lifespan_ensure.start()
        main.app.dependency_overrides[devices_router.get_client] = _fake_get_client
        main.app.dependency_overrides[networks_router.get_client] = _fake_get_client

        self.http = TestClient(main.app)

    def tearDown(self):
        self.http.close()
        main.app.dependency_overrides.clear()
        self._auth_ensure.stop()
        self._auth_reset.stop()
        self._lifespan_ensure.stop()

    def test_auth_session_flow(self):
        status = self.http.get("/api/auth/status")
        self.assertEqual(status.status_code, 200)
        self.assertTrue(status.json()["authenticated"])

        login = self.http.post("/api/auth/login", json={"identifier": "user@example.com"})
        self.assertEqual(login.status_code, 200)
        self.assertEqual(login.json()["status"], "verification_required")

        verify = self.http.post("/api/auth/verify", json={"code": "123456"})
        self.assertEqual(verify.status_code, 200)
        self.assertEqual(verify.json()["status"], "authenticated")

    def test_devices_endpoint_smoke(self):
        resp = self.http.get("/api/networks/1/devices")
        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertEqual(len(body["devices"]), 1)
        self.assertEqual(body["devices"][0]["display_name"], "iPhone")

    def test_settings_endpoint_smoke(self):
        resp = self.http.get("/api/networks/1/settings")
        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertEqual(body["name"], "Home")
        self.assertIn("speed", body)


if __name__ == "__main__":
    unittest.main()
