# Module 01 - AI MCP Proxy

> **The scenario.** Your AI assistants need tools. VS Code Copilot, Claude Desktop, and custom agents all speak MCP (Model Context Protocol) - but your backend is a plain REST API. You also have a third-party MCP server you want to front with Kong. And a multi-team setup where each team publishes tools independently that need to appear as a unified catalogue.
>
> In the next ~90 minutes you'll configure Kong's `ai-mcp-proxy` plugin in all four modes, solving each of these problems one at a time.

## What you'll have at the end

Kong configured as an MCP gateway with all four `ai-mcp-proxy` modes, so you can pick the right one for every architecture:

| Mode | What Kong does | When to use it |
|---|---|---|
| `passthrough-listener` | Accepts MCP, proxies unchanged to upstream MCP server | You already have an MCP server and want Kong to front it |
| `conversion-listener` | Converts REST API → MCP tools AND accepts MCP requests | Make an existing REST API available to MCP clients |
| `conversion-only` | Defines reusable tool specs, no live endpoint | Shared tool library for multi-team environments |
| `listener` | Aggregates `conversion-only` tools via tags onto one endpoint | Single MCP entry-point across multiple services |

```
MCP Client (VS Code / Claude / curl)
         │
         ▼
   Kong AI Gateway 3.14  ←── ai-mcp-proxy plugin
         │
         ├── passthrough-listener ────────────────▶ Upstream MCP Server
         │
         ├── conversion-listener ─────────────────▶ REST API (OpenAPI)
         │
         ├── conversion-only (no client endpoint)
         │         ↓ tags
         └── listener ────────────────────────────▶ Aggregated REST APIs
```

## Who this module is for

You have Kong Gateway 3.14 running (Konnect or local Docker) with an AI Gateway Enterprise licence. You have the MCP backend server running at `localhost:3001`. See [Prerequisites](/prerequisites) if you need to set these up.

::: warning AI Gateway Enterprise required
`ai-mcp-proxy` requires **Kong Gateway 3.14+** with an AI Gateway Enterprise licence.  
`passthrough-listener` and `conversion-listener` were introduced in 3.12; `conversion-only` and `listener` in 3.13.
:::

## Three concepts you need today

| Concept | What it is | Why it matters |
|---|---|---|
| **MCP (Model Context Protocol)** | JSON-RPC 2.0 protocol for AI agents to call external tools | The protocol VS Code Copilot and Claude use when invoking tools |
| **Plugin mode** | The `config.mode` parameter that controls how the plugin handles MCP requests | The mode determines whether Kong proxies, converts, defines, or aggregates |
| **Tag-based aggregation** | `conversion-only` plugins publish tools under a tag; `listener` binds to that tag | Decouples tool definition from tool serving in multi-service architectures |

## Labs

| Lab | Topic | Time |
|---|---|---|
| [01-A: Passthrough Listener](/module-01-mcp-proxy/labs/01-passthrough-listener) | Front an existing MCP server with Kong auth + rate limiting | ~25 min |
| [01-B: Conversion Listener](/module-01-mcp-proxy/labs/01-conversion-listener) | Auto-convert a REST API into MCP tools with ACL control | ~35 min |
| [01-C: Conversion-Only + Listener](/module-01-mcp-proxy/labs/01-conversion-aggregation) | Publish tool specs independently; aggregate into one endpoint | ~30 min |

## MCP JSON-RPC method reference

| Method | Description |
|---|---|
| `initialize` | Handshake - exchange protocol version and capabilities |
| `tools/list` | Get all available tool definitions |
| `tools/call` | Execute a specific tool |
| `resources/list` | List available data resources |
| `prompts/list` | List available prompt templates |

## Exit ticket

After the labs, can you answer these without looking?

1. Which mode would you choose to front a third-party SaaS MCP server that you cannot modify?
2. You have three teams, each with a `conversion-only` plugin tagged `"internal-tools"`. How does a `listener` plugin pick them all up?
3. Why does `conversion-listener` require Route scoping, but `passthrough-listener` does not?
4. Where would you attach `key-auth` to require authentication for MCP tool calls?

## Common pitfalls

| Symptom | Likely cause |
|---|---|
| Plugin skips conversion and logs a warning | `conversion-listener` or `conversion-only` applied to a Service without a Route |
| `listener` returns an empty tools list | `server.tag` on the listener doesn't match `tags` on the conversion-only plugins |
| `tools/call` returns `INVALID_PARAMS -32602` | `arguments` field names don't match the upstream OpenAPI operation parameters |
| ACL rules not evaluated in `listener` mode | `include_consumer_groups: true` is missing from the listener config |
| Kong returns 404 on MCP route | Route `methods` list doesn't include both `POST` and `GET` |

---

*Next: [Module 02 - MCP + OAuth2 →](/module-02-mcp-oauth2/)*
