"""Standalone mock API server for screenshot demos.

Run: python3 mock-server.py
Serves fake data on port 8420 (same as real backend).
"""

import json
import random
from http.server import HTTPServer, BaseHTTPRequestHandler

NETWORK_ID = "fake-net-001"

DEVICES = [
    {"hostname": "MacBook-Pro", "display_name": "MacBook Pro", "manufacturer": "Apple", "device_type": "laptop", "connection_type": "wireless", "wireless": True},
    {"hostname": "iPhone-15", "display_name": "iPhone 15 Pro", "manufacturer": "Apple", "device_type": "phone", "connection_type": "wireless", "wireless": True},
    {"hostname": "iPad-Air", "display_name": "iPad Air", "manufacturer": "Apple", "device_type": "tablet", "connection_type": "wireless", "wireless": True},
    {"hostname": "Galaxy-S24", "display_name": "Galaxy S24 Ultra", "manufacturer": "Samsung", "device_type": "phone", "connection_type": "wireless", "wireless": True},
    {"hostname": "PS5", "display_name": "PlayStation 5", "manufacturer": "Sony", "device_type": "gaming", "connection_type": "wired", "wireless": False},
    {"hostname": "Xbox-Series-X", "display_name": "Xbox Series X", "manufacturer": "Microsoft", "device_type": "gaming", "connection_type": "wired", "wireless": False},
    {"hostname": "LG-OLED-TV", "display_name": "Living Room TV", "manufacturer": "LG", "device_type": "tv", "connection_type": "wireless", "wireless": True},
    {"hostname": "Sonos-Arc", "display_name": "Sonos Arc Soundbar", "manufacturer": "Sonos", "device_type": "speaker", "connection_type": "wireless", "wireless": True},
    {"hostname": "Ring-Doorbell", "display_name": "Ring Video Doorbell", "manufacturer": "Ring", "device_type": "camera", "connection_type": "wireless", "wireless": True},
    {"hostname": "Nest-Thermostat", "display_name": "Nest Thermostat", "manufacturer": "Google", "device_type": "smart_home", "connection_type": "wireless", "wireless": True},
    {"hostname": "HP-LaserJet", "display_name": "HP LaserJet Pro", "manufacturer": "HP", "device_type": "printer", "connection_type": "wireless", "wireless": True},
    {"hostname": "Philips-Hue-Bridge", "display_name": "Philips Hue Bridge", "manufacturer": "Philips", "device_type": "smart_home", "connection_type": "wired", "wireless": False},
    {"hostname": "Echo-Studio", "display_name": "Echo Studio", "manufacturer": "Amazon", "device_type": "speaker", "connection_type": "wireless", "wireless": True},
    {"hostname": "Nintendo-Switch", "display_name": "Nintendo Switch", "manufacturer": "Nintendo", "device_type": "gaming", "connection_type": "wireless", "wireless": True},
    {"hostname": "ThinkPad-X1", "display_name": "ThinkPad X1 Carbon", "manufacturer": "Lenovo", "device_type": "laptop", "connection_type": "wireless", "wireless": True},
    {"hostname": "Pixel-8", "display_name": "Pixel 8 Pro", "manufacturer": "Google", "device_type": "phone", "connection_type": "wireless", "wireless": True},
    {"hostname": "Samsung-TV-Bedroom", "display_name": "Bedroom TV", "manufacturer": "Samsung", "device_type": "tv", "connection_type": "wireless", "wireless": True},
    {"hostname": "Roomba-j7", "display_name": "iRobot Roomba j7+", "manufacturer": "iRobot", "device_type": "smart_home", "connection_type": "wireless", "wireless": True},
    {"hostname": "Apple-Watch", "display_name": "Apple Watch Ultra", "manufacturer": "Apple", "device_type": "wearable", "connection_type": "wireless", "wireless": True},
    {"hostname": "Synology-NAS", "display_name": "Synology NAS DS920+", "manufacturer": "Synology", "device_type": "nas", "connection_type": "wired", "wireless": False},
]

# Generate full device data
def make_devices():
    devices = []
    for i, d in enumerate(DEVICES):
        mac = f"AA:BB:CC:DD:{i:02X}:{random.randint(0,255):02X}"
        ip = f"192.168.1.{10 + i}"
        devices.append({
            "url": f"/2.2/devices/{1000 + i}",
            "hostname": d["hostname"],
            "display_name": d["display_name"],
            "nickname": d["display_name"],
            "ip": ip,
            "mac": mac,
            "manufacturer": d["manufacturer"],
            "device_type": d["device_type"],
            "connection_type": d["connection_type"],
            "connected": True,
            "wireless": d["wireless"],
            "profile": {"url": f"/2.2/networks/{NETWORK_ID}/profiles/{(i % 4) + 1}", "name": ["Family", "Kids", "Work", "Guests"][i % 4]},
            "usage": {"down": random.randint(100_000_000, 5_000_000_000), "up": random.randint(10_000_000, 500_000_000)},
            "paused": False,
            "blocked": False,
        })
    return devices


EERO_NODES = [
    {
        "url": f"/2.2/eeros/1",
        "serial": "E0100001",
        "model": "eero Pro 6E",
        "model_number": "K010001",
        "location": "Living Room",
        "status": "green",
        "connected_clients_count": 8,
        "mesh_quality_bars": 5,
        "gateway": True,
        "ip_address": "192.168.1.1",
        "mac_address": "00:1A:2B:3C:4D:01",
        "os_version": "7.3.0-1234",
        "ethernet": True,
        "wired": True,
        "connection_type": "wired",
        "last_reboot": "2026-05-15T08:00:00Z",
        "update_available": False,
        "hardware_rev": "1.0",
        "led_on": True,
        "led_brightness": 100,
        "nightlight": {"enabled": False, "brightness": 50, "schedule": {"enabled": False, "on": "20:00", "off": "06:00"}, "ambient_light_enabled": False},
    },
    {
        "url": f"/2.2/eeros/2",
        "serial": "E0100002",
        "model": "eero Pro 6E",
        "model_number": "K010001",
        "location": "Office",
        "status": "green",
        "connected_clients_count": 6,
        "mesh_quality_bars": 4,
        "gateway": False,
        "ip_address": "192.168.1.2",
        "mac_address": "00:1A:2B:3C:4D:02",
        "os_version": "7.3.0-1234",
        "ethernet": False,
        "wired": False,
        "connection_type": "wireless",
        "last_reboot": "2026-05-15T08:00:00Z",
        "update_available": False,
        "hardware_rev": "1.0",
        "led_on": True,
        "led_brightness": 100,
        "nightlight": {"enabled": True, "brightness": 30, "schedule": {"enabled": True, "on": "20:00", "off": "06:00"}, "ambient_light_enabled": True},
    },
    {
        "url": f"/2.2/eeros/3",
        "serial": "E0100003",
        "model": "eero 6+",
        "model_number": "K010002",
        "location": "Bedroom",
        "status": "green",
        "connected_clients_count": 6,
        "mesh_quality_bars": 4,
        "gateway": False,
        "ip_address": "192.168.1.3",
        "mac_address": "00:1A:2B:3C:4D:03",
        "os_version": "7.3.0-1234",
        "ethernet": False,
        "wired": False,
        "connection_type": "wireless",
        "last_reboot": "2026-05-16T10:30:00Z",
        "update_available": False,
        "hardware_rev": "1.0",
        "led_on": True,
        "led_brightness": 75,
        "nightlight": {"enabled": False, "brightness": 50, "schedule": {"enabled": False, "on": "21:00", "off": "07:00"}, "ambient_light_enabled": False},
    },
]

import os as _os
_extra = int(_os.environ.get("MOCK_EXTRA_NODES", "0") or "0")
for _i in range(_extra):
    _idx = len(EERO_NODES) + 1
    EERO_NODES.append({
        "url": f"/2.2/eeros/{_idx}",
        "serial": f"E010{_idx:04d}",
        "model": "eero 6+",
        "model_number": "K010001",
        "location": f"Extra Node {_idx}",
        "status": "green",
        "connected_clients_count": 2,
        "mesh_quality_bars": 4,
        "gateway": False,
        "ip_address": f"192.168.1.{_idx}",
        "mac_address": f"00:1A:2B:3C:4D:{_idx:02X}",
        "os_version": "7.3.0-1234",
        "ethernet": False,
        "wired": False,
        "connection_type": "wireless",
        "last_reboot": "2026-05-16T10:30:00Z",
        "update_available": False,
        "hardware_rev": "1.0",
        "led_on": True,
        "led_brightness": 75,
        "nightlight": {"enabled": False, "brightness": 50, "schedule": {"enabled": False, "on": "21:00", "off": "07:00"}, "ambient_light_enabled": False},
    })

PROFILES = [
    {"url": f"/2.2/networks/{NETWORK_ID}/profiles/1", "name": "Family", "paused": False, "devices": [{"url": f"/2.2/devices/{1000 + i}"} for i in range(0, 5)]},
    {"url": f"/2.2/networks/{NETWORK_ID}/profiles/2", "name": "Kids", "paused": False, "devices": [{"url": f"/2.2/devices/{1000 + i}"} for i in range(5, 10)]},
    {"url": f"/2.2/networks/{NETWORK_ID}/profiles/3", "name": "Work", "paused": False, "devices": [{"url": f"/2.2/devices/{1000 + i}"} for i in range(10, 15)]},
    {"url": f"/2.2/networks/{NETWORK_ID}/profiles/4", "name": "Guests", "paused": False, "devices": [{"url": f"/2.2/devices/{1000 + i}"} for i in range(15, 20)]},
]

NETWORK = {
    "url": f"/2.2/networks/{NETWORK_ID}",
    "name": "Home Network",
    "status": "green",
    "speed": {"down": {"value": 487, "units": "Mbps"}, "up": {"value": 42, "units": "Mbps"}, "date": "2026-05-19T10:00:00Z"},
    "eeros": {"count": 3},
    "clients": {"count": 20},
    "gateway_eero": "/2.2/eeros/1",
    "password": "SecureWiFi2026!",
    "timezone": {"value": "America/Los_Angeles"},
    "sqm": {"enabled": True, "mode": "auto", "upload_bandwidth_mbps": 45, "download_bandwidth_mbps": 500},
    "upnp": True,
    "ipv6_upstream": True,
    "band_steering": True,
    "wpa3": True,
    "thread": True,
    "guest_network": {"enabled": True, "name": "Home Guest", "password": "GuestPass123"},
    "dns": {"mode": "default", "caching": True, "custom": {"ips": []}},
    "premium_status": "active",
    "updates": {"title": "eero OS 7.3.0", "status": "up_to_date"},
    "wan_ip": "76.142.58.201",
    "gateway_ip": "192.168.1.1",
}

SETTINGS = {
    "name": NETWORK["name"],
    "password": NETWORK["password"],
    "timezone": NETWORK["timezone"],
    "sqm": NETWORK["sqm"],
    "upnp": NETWORK["upnp"],
    "ipv6_upstream": NETWORK["ipv6_upstream"],
    "band_steering": NETWORK["band_steering"],
    "wpa3": NETWORK["wpa3"],
    "thread": NETWORK["thread"],
    "guest_network": NETWORK["guest_network"],
    "dns": NETWORK["dns"],
    "premium_status": NETWORK["premium_status"],
    "updates": NETWORK["updates"],
    "speed": NETWORK["speed"],
    "wan_ip": NETWORK["wan_ip"],
    "gateway_ip": NETWORK["gateway_ip"],
    "status": NETWORK["status"],
}

SPEED_HISTORY = [
    {"date": f"2026-05-{19 - i:02d}T10:00:00Z", "down": random.randint(400, 520), "up": random.randint(35, 50)}
    for i in range(14)
]

FORWARDS = [
    {"url": f"/2.2/networks/{NETWORK_ID}/forwards/1", "ip": "192.168.1.14", "gateway_port": 8080, "client_port": 80, "protocol": "tcp_udp", "description": "Web Server", "enabled": True},
    {"url": f"/2.2/networks/{NETWORK_ID}/forwards/2", "ip": "192.168.1.29", "gateway_port": 25565, "client_port": 25565, "protocol": "tcp", "description": "Minecraft", "enabled": True},
]

RESERVATIONS = [
    {"url": f"/2.2/networks/{NETWORK_ID}/reservations/1", "ip": "192.168.1.14", "mac": "AA:BB:CC:DD:04:A1", "description": "ThinkPad X1 Carbon", "hostname": "ThinkPad-X1", "nickname": "ThinkPad X1 Carbon"},
    {"url": f"/2.2/networks/{NETWORK_ID}/reservations/2", "ip": "192.168.1.29", "mac": "AA:BB:CC:DD:13:B2", "description": "Synology NAS DS920+", "hostname": "Synology-NAS", "nickname": "Synology NAS DS920+"},
]


# Seed random for consistent usage values across requests
random.seed(42)
CACHED_DEVICES = make_devices()


class MockHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        path = self.path.split("?")[0]  # strip query params

        routes = {
            "/api/health": lambda: {"status": "ok", "version": "1.0.0", "authenticated": True, "data_dir": True, "dry_run": True},
            "/api/auth/status": lambda: {"authenticated": True, "name": "Demo User", "email": "demo@example.com"},
            "/api/networks": lambda: {"networks": [NETWORK]},
            f"/api/networks/{NETWORK_ID}": lambda: NETWORK,
            f"/api/networks/{NETWORK_ID}/devices": lambda: {"devices": CACHED_DEVICES},
            f"/api/networks/{NETWORK_ID}/eeros": lambda: {"eeros": EERO_NODES},
            f"/api/networks/{NETWORK_ID}/profiles": lambda: {"profiles": PROFILES},
            f"/api/networks/{NETWORK_ID}/settings": lambda: SETTINGS,
            f"/api/networks/{NETWORK_ID}/security": lambda: {"wpa3": True, "band_steering": True, "upnp": True, "ipv6_upstream": True, "thread": True},
            f"/api/networks/{NETWORK_ID}/dns": lambda: NETWORK["dns"],
            f"/api/networks/{NETWORK_ID}/forwards": lambda: {"forwards": FORWARDS},
            f"/api/networks/{NETWORK_ID}/reservations": lambda: {"reservations": RESERVATIONS},
            f"/api/networks/{NETWORK_ID}/password": lambda: {"password": NETWORK["password"]},
            f"/api/networks/{NETWORK_ID}/sqm": lambda: NETWORK["sqm"],
            f"/api/networks/{NETWORK_ID}/updates": lambda: NETWORK["updates"],
            f"/api/networks/{NETWORK_ID}/thread": lambda: {"enabled": True, "status": "active"},
            f"/api/networks/{NETWORK_ID}/routing": lambda: {"mode": "bridge"},
            f"/api/networks/{NETWORK_ID}/blacklist": lambda: {"blacklist": []},
            f"/api/networks/{NETWORK_ID}/diagnostics": lambda: {"status": "healthy", "latency_ms": 12, "packet_loss": 0.0},
            f"/api/networks/{NETWORK_ID}/activity": lambda: {"summary": {"total_down": 42_000_000_000, "total_up": 5_000_000_000, "active_clients": 18}},
            f"/api/networks/{NETWORK_ID}/activity/history": lambda: {"history": [{"hour": h, "down": random.randint(1_000_000_000, 4_000_000_000), "up": random.randint(100_000_000, 500_000_000)} for h in range(24)]},
            f"/api/networks/{NETWORK_ID}/activity/clients": lambda: {"clients": [{"name": d["display_name"], "down": d["usage"]["down"], "up": d["usage"]["up"]} for d in CACHED_DEVICES[:10]]},
            f"/api/networks/{NETWORK_ID}/activity/categories": lambda: {"categories": [{"name": "Streaming", "down": 18_000_000_000}, {"name": "Gaming", "down": 8_000_000_000}, {"name": "Social Media", "down": 5_000_000_000}, {"name": "Work", "down": 7_000_000_000}, {"name": "Other", "down": 4_000_000_000}]},
            f"/api/networks/{NETWORK_ID}/speed-history": lambda: {"history": SPEED_HISTORY, "retention_days": 14},
        }

        # Match device-specific routes
        if path.startswith(f"/api/networks/{NETWORK_ID}/devices/") and path.count("/") == 5:
            device_id = path.split("/")[-1]
            for d in CACHED_DEVICES:
                if d["url"].endswith(f"/{device_id}"):
                    self._json_response(d)
                    return
            self._json_response(CACHED_DEVICES[0])
            return

        if path.startswith(f"/api/networks/{NETWORK_ID}/devices/") and path.endswith("/priority"):
            self._json_response({"prioritized": False, "duration_minutes": None})
            return

        # Match eero-specific routes
        if path.startswith(f"/api/networks/{NETWORK_ID}/eeros/") and path.count("/") == 5:
            eero_id = path.split("/")[-1]
            for e in EERO_NODES:
                if e["url"].endswith(f"/{eero_id}"):
                    self._json_response(e)
                    return
            self._json_response(EERO_NODES[0])
            return

        if path in routes:
            self._json_response(routes[path]())
        else:
            self._json_response({"detail": "Not found"}, 404)

    def do_POST(self):
        self._json_response({"status": "ok", "data": {}, "_dry_run": True})

    def do_PUT(self):
        self._json_response({"status": "ok", "data": {}, "_dry_run": True})

    def do_PATCH(self):
        self._json_response({"status": "ok", "data": {}, "_dry_run": True})

    def do_DELETE(self):
        self._json_response({"status": "ok"})

    def _json_response(self, data, status=200):
        body = json.dumps(data).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def log_message(self, format, *args):
        print(f"  {args[0]}")


if __name__ == "__main__":
    port = 8420
    print(f"🎭 Mock eero API server running on http://localhost:{port}")
    print(f"   Network: {NETWORK['name']} ({NETWORK_ID})")
    print(f"   Devices: {len(CACHED_DEVICES)} connected")
    print(f"   Gateway: 192.168.1.1")
    print()
    HTTPServer(("", port), MockHandler).serve_forever()
