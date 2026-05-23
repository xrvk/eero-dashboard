"""Canned demo data served when ``EERO_DEMO_DATA=true``.

Ported from the legacy ``mock-server.py`` standalone script so the real
FastAPI backend can serve the same fake network behind the demo flag.
A single ``NETWORK_ID`` is used so every endpoint is internally consistent
(including the speed-history seed in ``backend/seed/``).
"""

from __future__ import annotations

import random

NETWORK_ID = "fake-net-001"

_DEVICE_SEED = [
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


def _make_devices() -> list[dict]:
    rng = random.Random(42)
    devices: list[dict] = []
    for i, d in enumerate(_DEVICE_SEED):
        devices.append({
            "url": f"/2.2/devices/{1000 + i}",
            "hostname": d["hostname"],
            "display_name": d["display_name"],
            "nickname": d["display_name"],
            "ip": f"192.168.1.{10 + i}",
            "mac": f"AA:BB:CC:DD:{i:02X}:{rng.randint(0, 255):02X}",
            "manufacturer": d["manufacturer"],
            "device_type": d["device_type"],
            "connection_type": d["connection_type"],
            "connected": True,
            "wireless": d["wireless"],
            "profile": {
                "url": f"/2.2/networks/{NETWORK_ID}/profiles/{(i % 4) + 1}",
                "name": ["Family", "Kids", "Work", "Guests"][i % 4],
            },
            "usage": {
                "down": rng.randint(100_000_000, 5_000_000_000),
                "up": rng.randint(10_000_000, 500_000_000),
            },
            "paused": False,
            "blocked": False,
        })
    return devices


DEVICES: list[dict] = _make_devices()

EERO_NODES: list[dict] = [
    {
        "url": "/2.2/eeros/1",
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
        "url": "/2.2/eeros/2",
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
        "url": "/2.2/eeros/3",
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

PROFILES: list[dict] = [
    {"url": f"/2.2/networks/{NETWORK_ID}/profiles/1", "name": "Family", "paused": False, "devices": [{"url": f"/2.2/devices/{1000 + i}"} for i in range(0, 5)]},
    {"url": f"/2.2/networks/{NETWORK_ID}/profiles/2", "name": "Kids", "paused": False, "devices": [{"url": f"/2.2/devices/{1000 + i}"} for i in range(5, 10)]},
    {"url": f"/2.2/networks/{NETWORK_ID}/profiles/3", "name": "Work", "paused": False, "devices": [{"url": f"/2.2/devices/{1000 + i}"} for i in range(10, 15)]},
    {"url": f"/2.2/networks/{NETWORK_ID}/profiles/4", "name": "Guests", "paused": False, "devices": [{"url": f"/2.2/devices/{1000 + i}"} for i in range(15, 20)]},
]

NETWORK: dict = {
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

SETTINGS: dict = {
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


def _make_speed_history() -> list[dict]:
    rng = random.Random(7)
    return [
        {
            "network_id": NETWORK_ID,
            "date": f"2026-05-{19 - i:02d}T10:00:00Z",
            "down": rng.randint(400, 520),
            "up": rng.randint(35, 50),
        }
        for i in range(14)
    ]


SPEED_HISTORY: list[dict] = _make_speed_history()

FORWARDS: list[dict] = [
    {"url": f"/2.2/networks/{NETWORK_ID}/forwards/1", "ip": "192.168.1.14", "gateway_port": 8080, "client_port": 80, "protocol": "tcp_udp", "description": "Web Server", "enabled": True},
    {"url": f"/2.2/networks/{NETWORK_ID}/forwards/2", "ip": "192.168.1.29", "gateway_port": 25565, "client_port": 25565, "protocol": "tcp", "description": "Minecraft", "enabled": True},
]

RESERVATIONS: list[dict] = [
    {"url": f"/2.2/networks/{NETWORK_ID}/reservations/1", "ip": "192.168.1.14", "mac": "AA:BB:CC:DD:04:A1", "description": "ThinkPad X1 Carbon", "hostname": "ThinkPad-X1", "nickname": "ThinkPad X1 Carbon"},
    {"url": f"/2.2/networks/{NETWORK_ID}/reservations/2", "ip": "192.168.1.29", "mac": "AA:BB:CC:DD:13:B2", "description": "Synology NAS DS920+", "hostname": "Synology-NAS", "nickname": "Synology NAS DS920+"},
]


def _hour_history() -> list[dict]:
    rng = random.Random(11)
    return [
        {"hour": h, "down": rng.randint(1_000_000_000, 4_000_000_000), "up": rng.randint(100_000_000, 500_000_000)}
        for h in range(24)
    ]


ACTIVITY_HISTORY: list[dict] = _hour_history()

ACTIVITY_CATEGORIES: list[dict] = [
    {"name": "Streaming", "down": 18_000_000_000},
    {"name": "Gaming", "down": 8_000_000_000},
    {"name": "Social Media", "down": 5_000_000_000},
    {"name": "Work", "down": 7_000_000_000},
    {"name": "Other", "down": 4_000_000_000},
]


def get_static_routes() -> dict[str, dict]:
    """Map of fully-qualified ``/api/...`` paths to demo response bodies."""
    return {
        "/api/auth/status": {"authenticated": True, "demo": True, "name": "Demo User", "email": "demo@example.com"},
        "/api/networks": {"networks": [NETWORK]},
        f"/api/networks/{NETWORK_ID}": NETWORK,
        f"/api/networks/{NETWORK_ID}/devices": {"devices": DEVICES},
        f"/api/networks/{NETWORK_ID}/eeros": {"eeros": EERO_NODES},
        f"/api/networks/{NETWORK_ID}/profiles": {"profiles": PROFILES},
        f"/api/networks/{NETWORK_ID}/settings": SETTINGS,
        f"/api/networks/{NETWORK_ID}/security": {"wpa3": True, "band_steering": True, "upnp": True, "ipv6_upstream": True, "thread": True},
        f"/api/networks/{NETWORK_ID}/dns": NETWORK["dns"],
        f"/api/networks/{NETWORK_ID}/forwards": {"forwards": FORWARDS},
        f"/api/networks/{NETWORK_ID}/reservations": {"reservations": RESERVATIONS},
        f"/api/networks/{NETWORK_ID}/password": {"password": NETWORK["password"]},
        f"/api/networks/{NETWORK_ID}/sqm": NETWORK["sqm"],
        f"/api/networks/{NETWORK_ID}/updates": NETWORK["updates"],
        f"/api/networks/{NETWORK_ID}/thread": {"enabled": True, "status": "active"},
        f"/api/networks/{NETWORK_ID}/routing": {"mode": "bridge"},
        f"/api/networks/{NETWORK_ID}/blacklist": {"blacklist": []},
        f"/api/networks/{NETWORK_ID}/diagnostics": {"status": "healthy", "latency_ms": 12, "packet_loss": 0.0},
        f"/api/networks/{NETWORK_ID}/activity": {"summary": {"total_down": 42_000_000_000, "total_up": 5_000_000_000, "active_clients": 18}},
        f"/api/networks/{NETWORK_ID}/activity/history": {"history": ACTIVITY_HISTORY},
        f"/api/networks/{NETWORK_ID}/activity/clients": {"clients": [{"name": d["display_name"], "down": d["usage"]["down"], "up": d["usage"]["up"]} for d in DEVICES[:10]]},
        f"/api/networks/{NETWORK_ID}/activity/categories": {"categories": ACTIVITY_CATEGORIES},
        f"/api/networks/{NETWORK_ID}/speed-history": {"history": SPEED_HISTORY, "retention_days": 14},
    }


def lookup_device(device_id: str) -> dict | None:
    for d in DEVICES:
        if d["url"].endswith(f"/{device_id}"):
            return d
    return None


def lookup_eero(eero_id: str) -> dict | None:
    for e in EERO_NODES:
        if e["url"].endswith(f"/{eero_id}"):
            return e
    return None
