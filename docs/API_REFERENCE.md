# API Reference (Backend)

Base path: `/api`

## Health

- `GET /health`

## Auth

- `GET /auth/status`
- `POST /auth/login`
- `POST /auth/verify`
- `POST /auth/logout`

## Networks

- `GET /networks`
- `GET /networks/{network_id}`
- `GET /networks/{network_id}/eeros`
- `GET /networks/{network_id}/profiles`
- `GET /networks/{network_id}/settings`

## Devices

- `GET /networks/{network_id}/devices`
- `GET /networks/{network_id}/devices/{device_id}`
- `POST /networks/{network_id}/devices/{device_id}/pause`
- `POST /networks/{network_id}/devices/{device_id}/block`
- `POST /networks/{network_id}/devices/{device_id}/rename` (compat)
- `POST /networks/{network_id}/devices/{device_id}/nickname`
- `GET /networks/{network_id}/devices/{device_id}/priority`
- `POST /networks/{network_id}/devices/{device_id}/priority`

## Network Ops

- `POST /prefetch/{network_id}`
- `GET /networks/{network_id}/dns`
- `POST /networks/{network_id}/dns/mode`
- `POST /networks/{network_id}/dns/caching`
- `GET /networks/{network_id}/activity`
- `GET /networks/{network_id}/activity/history`
- `GET /networks/{network_id}/activity/clients`
- `GET /networks/{network_id}/activity/categories`
- `GET /networks/{network_id}/diagnostics`
- `POST /networks/{network_id}/diagnostics`

## Other network management endpoints

- Speed test/history
- Security settings
- Profile pause/schedule/content filters
- Guest network
- Port forwards and DHCP reservations
- SQM/QoS
- Blacklist
- Thread/routing/updates/reboot helpers

For endpoint source-of-truth, see:
- `/tmp/workspace/xrvk/eero-dashboard/backend/main.py`
- `/tmp/workspace/xrvk/eero-dashboard/backend/features/**/router.py`
