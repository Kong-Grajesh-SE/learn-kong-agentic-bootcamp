---
title: Lab Resources
description: Downloadable decK files, MCP server, Docker services, and Insomnia collection for Agentic AI labs.
---

# Lab Resources

::: tip Download and use alongside the labs
These are the actual configuration files, MCP server, and Docker services used in the bootcamp labs. Clone the full `resources/` folder to follow along.
:::

## decK Configuration Files

Each file is a self-contained gateway state. Sync one at a time — each replaces the previous.

| File | Step | What it configures |
|---|---|---|
| [01-mcp-passthrough.yaml](resources/deck/01-mcp-passthrough.yaml) | 1 | MCP Passthrough Listener |
| [02-passthrough-auth.yaml](resources/deck/02-passthrough-auth.yaml) | 2 | + key-auth + rate-limiting |
| [03-conversion-listener.yaml](resources/deck/03-conversion-listener.yaml) | 3 | REST → MCP Conversion Listener |
| [04-aggregation.yaml](resources/deck/04-aggregation.yaml) | 4 | Multi-Team Aggregation |
| [05-mcp-oauth2.yaml](resources/deck/05-mcp-oauth2.yaml) | 5 | MCP + OAuth2 (client_credentials + PKCE) |
| [06-a2a-routing.yaml](resources/deck/06-a2a-routing.yaml) | 6 | A2A Agent Routing |
| [07-mcp-guardrails.yaml](resources/deck/07-mcp-guardrails.yaml) | 7 | MCP Tool-Call Authorization with OPA |

### How to apply

```bash
deck gateway sync resources/deck/01-mcp-passthrough.yaml \
  --konnect-token "$KONNECT_TOKEN" \
  --konnect-control-plane-name "$CP_NAME"
```

---

## Docker Services

| File | Service | Description |
|---|---|---|
| [docker-compose.yml](resources/docker-compose.yml) | MCP Backend | Travel tools: flights, hotels, weather |
| [mcp-server/](resources/mcp-server/) | MCP Server (Node.js) | The MCP backend server source |
| [services/mcp-tool-server/](resources/services/mcp-tool-server/) | MCP Tool Server | Demo tools for OPA guardrail testing |
| [services/opa-policy-service/](resources/services/opa-policy-service/) | OPA Policy Service | Custom guardrail PDP |
| [ngrok-mcp-guardrails.yml](resources/ngrok-mcp-guardrails.yml) | ngrok config | For serverless DP tunnel setup |

```bash
# Start MCP backend
cd resources && docker compose up -d --build

# Start Keycloak (for Step 5 - OAuth2/PKCE)
cd resources/keycloak && docker compose up -d

# Connect Kong DP to the backend network
docker network connect 05-mcp-a2a_kong-net <kong-dp-container>

# Start guardrail services (Step 7)
docker compose up -d mcp-tool-server opa-policy-service
```

---

## Keycloak (Step 5)

Shared Keycloak for OAuth2 and PKCE flows.

| File | Description |
|---|---|
| [keycloak/docker-compose.yml](resources/keycloak/docker-compose.yml) | Docker Compose for Keycloak |
| [keycloak/realm-bootcamp.json](resources/keycloak/realm-bootcamp.json) | Pre-configured realm |

Pre-built identities:

| User/Client | Credentials | Type |
|---|---|---|
| agent-user | agent123 | User (PKCE flow) |
| mcp-service-client | mcp-service-secret | Confidential (client_credentials) |
| mcp-pkce-client | (no secret) | Public (authorization_code + PKCE) |

---

## Insomnia Collection

| File | Description |
|---|---|
| [kong-mcp-a2a-bootcamp.json](resources/insomnia/kong-mcp-a2a-bootcamp.json) | Full Insomnia collection for MCP & A2A tests |

---

## VS Code MCP Configuration

For Step 5 — connect VS Code Copilot to the MCP server through Kong:

```json
// .vscode/mcp.json
{
  "servers": {
    "kong-travel-mcp": {
      "type": "http",
      "url": "http://localhost:8000/mcp-oauth/tools",
      "headers": { "Content-Type": "application/json" },
      "auth": {
        "type": "oauth2",
        "authorizationUrl": "http://localhost:8080/realms/bootcamp/protocol/openid-connect/auth",
        "tokenUrl": "http://localhost:8080/realms/bootcamp/protocol/openid-connect/token",
        "clientId": "mcp-pkce-client",
        "scopes": ["openid", "profile", "mcp-tools"],
        "pkce": true
      }
    }
  }
}
```

---

## Source

These resources are sourced from the [Kong Bootcamp Repo](https://github.com/Kong-Grajesh-SE/bootcamp-repo/tree/main/05-mcp-a2a).
