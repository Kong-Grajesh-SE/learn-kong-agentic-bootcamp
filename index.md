---
layout: home

hero:
  name: "Kong Agentic AI"
  text: "& MCP Bootcamp"
  tagline: "Secure and proxy MCP tool calls. OAuth2/PKCE authentication. Agent-to-Agent routing. Connect VS Code and Claude to Kong-protected endpoints."
  image:
    src: /kong-gateway-logo.svg
    alt: Kong Agentic AI & MCP
  actions:
    - theme: brand
      text: "Start Module →"
      link: /module-01-agentic-mcp/
    - theme: brand
      text: "🔌 MCP Proxy Lab"
      link: /module-01-agentic-mcp/labs/08-mcp-proxy
    - theme: alt
      text: "☁️ Konnect ↗"
      link: https://cloud.konghq.com

features:
  - icon: 🔌
    title: "MCP Proxy"
    details: "Configure Kong's ai-mcp-proxy plugin in conversion-listener mode. Translate between REST and MCP JSON-RPC protocol transparently."
    link: /module-01-agentic-mcp/labs/08-mcp-proxy
    linkText: Start lab →

  - icon: 🔐
    title: "MCP + OAuth2/PKCE"
    details: "Secure MCP endpoints with OAuth2 Authorization Code + PKCE flow. Connect VS Code Copilot and Claude Desktop to Kong-protected MCP servers."
    link: /module-01-agentic-mcp/labs/08-mcp-oauth2
    linkText: Secure MCP →

  - icon: 🤝
    title: "A2A Agent Routing"
    details: "Route Agent-to-Agent (A2A) calls across sub-agents through Kong. Policy enforcement, auth, and observability for multi-agent workflows."
    link: /module-01-agentic-mcp/labs/08-a2a-agents
    linkText: Connect agents →

  - icon: 🛠️
    title: "MCP Protocol"
    details: "Understand MCP JSON-RPC 2.0: tools/list, tools/call, and resource discovery. Call travel tools like search_flights, book_hotel, get_weather."
    link: /module-01-agentic-mcp/
    linkText: Learn MCP →

  - icon: 🔄
    title: "Two-Route Architecture"
    details: "Route A (unauthenticated) for curl and web demos. Route B (OAuth2) for VS Code, Claude, and production agents. Same backend, different security."
    link: /module-01-agentic-mcp/
    linkText: See architecture →

  - icon: ☁️
    title: "Konnect Deployment"
    details: "All labs run on Konnect Hybrid mode — cloud control plane, local Docker data plane. No license required with Konnect free tier."
    link: /module-01-agentic-mcp/
    linkText: Deploy now →
---
