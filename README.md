# Kong Agentic AI & MCP Bootcamp

A hands-on bootcamp for securing and proxying MCP (Model Context Protocol) tool calls with Kong Gateway. Covers OAuth2/PKCE authentication, Agent-to-Agent routing, and connecting VS Code Copilot and Claude Desktop to Kong-protected endpoints.

## What You'll Learn

- Proxy MCP over HTTP using Kong's `ai-mcp-proxy` plugin
- Secure MCP endpoints with OAuth2 Authorization Code + PKCE flow
- Route Agent-to-Agent (A2A) calls through Kong with policy enforcement
- Connect VS Code Copilot and Claude Desktop to Kong-protected MCP servers
- Deploy on Konnect Hybrid mode (cloud control plane, local Docker data plane)

## Modules

### Module 01 — Agentic MCP

| Lab | Topic |
|-----|-------|
| [08-A: MCP Proxy](module-01-agentic-mcp/labs/08-mcp-proxy.md) | Configure `ai-mcp-proxy`, test tool calls with curl |
| [08-B: MCP + OAuth2](module-01-agentic-mcp/labs/08-mcp-oauth2.md) | Secure MCP with OAuth2 PKCE, connect VS Code |
| [08-C: A2A Agents](module-01-agentic-mcp/labs/08-a2a-agents.md) | Route Agent-to-Agent calls through Kong |

## Architecture

```
VS Code Copilot / Claude Desktop
        │
        ▼
  Kong Gateway (Konnect)
  ┌──────────────────────────────────────────┐
  │ Route A: POST /mcp/tools                 │
  │ Plugin:  ai-mcp-proxy (conversion-mode)  │  ← curl, web demos
  └──────────────────────────────────────────┘
  ┌──────────────────────────────────────────┐
  │ Route B: POST /mcp-oauth/tools           │
  │ Plugin 1: ai-mcp-oauth2 (OAuth2 + PKCE)  │  ← VS Code, Claude, agents
  │ Plugin 2: ai-mcp-proxy  (passthrough)    │
  └──────────────────────────────────────────┘
        │
        ▼
  Express MCP Server (:3001)
  Tools: search_flights, book_hotel, get_weather, ...
```

## Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Kong Konnect](https://cloud.konghq.com) account (free tier works)
- Docker (for local data plane)
- VS Code with GitHub Copilot (optional, for OAuth2 lab)

## Getting Started

```bash
# Install dependencies
npm install

# Start the docs site locally
npm run docs:dev
```

The docs site will be available at `http://localhost:5173`.

## Stack

| Component | Technology |
|-----------|-----------|
| Docs site | [VitePress](https://vitepress.dev/) |
| API Gateway | Kong Gateway (Konnect Hybrid) |
| MCP Backend | Express.js (JSON-RPC 2.0) |
| Auth | OAuth2 Authorization Code + PKCE |

## Resources

- [MCP Specification](https://modelcontextprotocol.io/)
- [ai-mcp-proxy plugin](https://developer.konghq.com/plugins/ai-mcp-proxy/)
- [ai-mcp-oauth2 plugin](https://developer.konghq.com/plugins/ai-mcp-oauth2/)
- [Kong Agentic AI overview](https://developer.konghq.com/ai-gateway/)
- [Kong Konnect](https://cloud.konghq.com)
