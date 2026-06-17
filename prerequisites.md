---
title: Prerequisites
description: Everything you need installed before starting the Kong Agentic AI Bootcamp.
---

# ✅ Prerequisites

> Before starting any lab, verify that every tool below is installed and working. Each section shows the install command, verify command, and minimum required version.

::: warning ⚙️ Kong Gateway 3.14+ required
This bootcamp targets **Kong Gateway 3.14 or newer**. The `ai-custom-guardrail` plugin requires 3.14+, and `ai-mcp-proxy` requires 3.12+. All labs assume 3.14.

- **Konnect** (recommended): Konnect Cloud always runs the latest released Kong - you're already on 3.14+.
- **Self-hosted hybrid**: pin the Data Plane container to `kong/kong-gateway:3.14` in your `docker-compose.yml`.
- **AI Gateway Enterprise licence**: required for `ai-mcp-proxy`, `ai-mcp-oauth2`, and `ai-custom-guardrail`. A Konnect Plus or Enterprise trial licence works.
:::

## Required Tools

| Tool | Purpose | Min Version | Install |
|---|---|---|---|
| **Kong Gateway** | The gateway itself | **3.14+** | Konnect cloud or `kong/kong-gateway:3.14` |
| **AI Gateway Enterprise licence** | Enables AI plugins | - | Konnect Plus / Enterprise trial |
| **Konnect account** | Hosts the Control Plane | Free tier | [cloud.konghq.com](https://cloud.konghq.com) |
| **Docker Desktop** | Run local MCP backend and Keycloak | 4.x | [docker.com/get-started](https://www.docker.com/get-started) |
| **Docker Compose** | Multi-container orchestration | v2.x | Bundled with Docker Desktop |
| **curl** | Terminal API testing | any | Pre-installed on macOS/Linux |
| **jq** | JSON processing | 1.6+ | `brew install jq` |
| **decK CLI** | Declarative Kong config | 1.43+ | See below |
| **Node.js** | MCP backend server | 20 LTS | [nodejs.org](https://nodejs.org) |
| **Git** | Clone repos | 2.x | Pre-installed on macOS |
| **Keycloak** | OAuth2 IdP for Module 02 | 24.x | Docker image (see Module 02) |
| **VS Code** | MCP client testing (optional) | latest | [code.visualstudio.com](https://code.visualstudio.com) |

---

## 🐳 Docker Desktop

::: tip Required for all labs
The MCP backend server, Keycloak, and Kong Data Plane all run via Docker Compose. Allocate at least 4 GB RAM.
:::

```bash
# Verify Docker is running
docker --version
# Docker version 27.x.x, build ...

docker compose version
# Docker Compose version v2.x.x

# Verify resources (should show ≥4 GB)
docker system info | grep -E "Memory|CPUs"
```

Docker Desktop → Settings → Resources → Memory: **4 GB minimum, 8 GB recommended**

---

## 🔵 jq

```bash
# macOS
brew install jq

# Ubuntu / Debian
sudo apt-get install -y jq

# Verify
jq --version
# jq-1.7.x
```

---

## 📦 decK CLI

decK is Kong's GitOps tool for managing configuration declaratively.

```bash
# macOS
brew install kong/deck/deck

# Linux
curl -sL https://github.com/Kong/deck/releases/latest/download/deck_linux_amd64.tar.gz \
  | tar -xz -C /usr/local/bin deck

# Verify
deck version
# decK v1.43.x (...)
```

---

## ☁️ Kong Konnect Account + AI Gateway Licence

All bootcamp labs use **Konnect** - Kong's managed control plane.

1. Go to [cloud.konghq.com](https://cloud.konghq.com)
2. Sign up with email or SSO (Google / GitHub)
3. Choose the **Plus** tier or start an **Enterprise trial** (AI plugins require this)
4. Complete the onboarding wizard
5. Copy your **Personal Access Token** (Account → Personal Access Tokens)

```bash
# Export your token and CP name - used in every deck command
export KONNECT_TOKEN="kpat_..."
export KONNECT_CP_NAME="your-control-plane-name"
export KONNECT_PROXY_URL="https://your-proxy.konghq.com"
export KONNECT_REGION="us"   # or eu, au

# Verify deck can reach Konnect
deck gateway ping \
  --konnect-token $KONNECT_TOKEN \
  --konnect-control-plane-name $KONNECT_CP_NAME
# Successfully Konnected to the Kong organization!
```

::: info AI Gateway Enterprise licence
`ai-mcp-proxy`, `ai-mcp-oauth2`, and `ai-custom-guardrail` require an **AI Gateway Enterprise** licence.  
On Konnect: this is included in the Plus and Enterprise tiers. Request a 30-day trial at [konghq.com/contact-sales](https://konghq.com/contact-sales).
:::

---

## 🖥️ Local Docker Services

The labs require Docker services for the MCP backend and Keycloak (OAuth2). Kong itself runs on Konnect — you only need Docker for these supporting services:

```bash
# Start the MCP backend and Keycloak
cd resources && docker compose up -d

# Start Keycloak (for OAuth2/PKCE labs)
cd resources/keycloak && docker compose up -d
# "3.14.x"

# Verify MCP backend
curl -s -X POST http://localhost:3001/mcp/tools \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' \
  | jq '.result.tools[].name'
```

---

## 🟩 Node.js - MCP Backend

The travel MCP backend is a small Express.js server included with this bootcamp.

```bash
# Verify Node.js
node --version
# v20.x.x

npm --version
# 10.x.x

# Install and start MCP backend
cd mcp-server
npm install
npm start
# MCP server running on http://localhost:3001

# Quick smoke test
curl -s -X POST http://localhost:3001/mcp/tools \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' \
  | jq '[.result.tools[].name]'
# ["search_flights","book_flight","get_weather","search_hotels","book_hotel"]
```

---

## 🔐 Keycloak - OAuth2 Identity Provider

Required for **Module 02 (MCP + OAuth2)** only.

```bash
# Start Keycloak via Docker (included in docker-compose.yml above)
docker compose up keycloak -d

# Wait ~30 seconds, then verify
curl -s http://localhost:8080/realms/workshop | jq '.realm'
# "workshop"

# Admin console: http://localhost:8080/admin
# Username: admin / Password: admin
```

::: tip Workshop realm
The `keycloak/realm-workshop.json` file in this repo pre-configures the `workshop` realm with the `mcp-tools` client scope. Import it on first boot (the docker-compose.yml does this automatically).
:::

---

## 🧩 VS Code (optional, Module 02)

For the VS Code GitHub Copilot MCP client lab:

1. Install [VS Code](https://code.visualstudio.com/) (latest stable)
2. Install the **GitHub Copilot** extension (`GitHub.copilot`)
3. Sign in to GitHub Copilot
4. Verify MCP support: `Ctrl+Shift+P` → `GitHub Copilot: Open MCP Tools`

---

## Environment variable cheatsheet

Add these to your shell profile (`~/.zshrc` or `~/.bashrc`):

```bash
# Kong / Konnect
export KONNECT_TOKEN="kpat_..."
export KONNECT_CP_NAME="agentic-bootcamp"
export KONNECT_PROXY_URL="http://localhost:8000"   # or your Konnect proxy URL
export KONNECT_REGION="us"
export KONG_AI_LICENSE="..."

# Keycloak (Module 02)
export KEYCLOAK_URL="http://localhost:8080"
export KEYCLOAK_REALM="workshop"
export KEYCLOAK_CLIENT_ID="mcp-oauth-client"
export KEYCLOAK_CLIENT_SECRET="mcp-oauth-secret"

# Guardrail service (Module 04)
export GUARDRAIL_API_KEY="..."
export GUARDRAIL_URL="http://localhost:4000/moderate"
```

---

*Ready? Start with [Module 01 - MCP Proxy →](/module-01-mcp-proxy/)*
