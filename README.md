<div align="center">

# 📶 eero Dashboard

**A self-hosted web dashboard for managing your eero mesh network**

[![React](https://img.shields.io/badge/react-19-61DAFB?style=for-the-badge&logo=react&logoColor=white)](https://react.dev)
[![FastAPI](https://img.shields.io/badge/fastapi-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Docker](https://img.shields.io/badge/docker-ready-2496ed?style=for-the-badge&logo=docker&logoColor=white)](https://ghcr.io/xrvk/eero-dashboard)

---

_A modern, responsive web dashboard for eero network management._
_Built for operators who want fast, efficient network control._

[Get Started](#-quick-start) · [Documentation](#-documentation) · [Features](#-features)

</div>

---

## 📸 Screenshots

| Devices | Network Health |
|---------|---------------|
| ![Devices](docs/screenshots/devices.png) | ![Health](docs/screenshots/health.png) |

| Device Detail | Profiles |
|---------------|----------|
| ![Device Detail](docs/screenshots/device-detail.png) | ![Profiles](docs/screenshots/profiles.png) |

| Settings |
|----------|
| ![Settings](docs/screenshots/settings.png) |

> **Note:** Uses the unofficial [`eero-api`](https://github.com/fulviofreitas/eero-api) library. All API calls go through eero's cloud — there is no local API. Amazon-linked eero accounts are not supported.

---

## ✨ Features

| 📊 Monitor | 🎛️ Control | 🎨 Experience |
|-----------|-----------|--------------|
| Network health & speed tests | Block/unblock devices | Dark & light themes |
| Device listing with usage stats | Pause/unpause profiles | Real-time filtering |
| eero node status & mesh quality | Reboot nodes, manage DNS | Instant tab switching |

---

## 🚀 Quick Start

```bash
docker compose up -d
```

Open **http://localhost:8420** 🎉

> 💡 See [Installation](./docs/html/installation.html) for Docker Compose setup, Synology NAS, or local development.

---

## 📚 Documentation

| 📖 Guide | Description |
|----------|-------------|
| [🚀 Installation](./docs/html/installation.html) | Docker, Synology NAS & local dev setup |
| [⚙️ Configuration](./docs/html/configuration.html) | Environment variables & cache behavior |
| [🏗️ Architecture](./docs/html/architecture/index.html) | System design, backend, frontend & data flow |
| [📡 API Reference](./docs/html/api-reference.html) | REST endpoint catalog |
| [🤝 Contributing](./CONTRIBUTING.md) | Dev workflow, testing & validation |

---

## 🆘 Support

- **Bug?** [Open a bug report](https://github.com/xrvk/eero-dashboard/issues/new?template=bug_report.yml)
- **Feature idea?** [Request a feature](https://github.com/xrvk/eero-dashboard/issues/new?template=feature_request.yml)
- **Want to contribute?** See [CONTRIBUTING.md](./CONTRIBUTING.md)

---

## 🔗 Related

- **[eero-api](https://github.com/fulviofreitas/eero-api)** — Async Python SDK for the eero cloud API
