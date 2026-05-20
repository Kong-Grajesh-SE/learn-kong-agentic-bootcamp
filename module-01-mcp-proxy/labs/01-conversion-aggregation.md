# Lab 01-C - Conversion-Only + Listener (Aggregation)

> **Goal.** In ~30 minutes you'll configure the two aggregation modes: `conversion-only` (define tools, no endpoint) and `listener` (aggregate tagged tool definitions onto one endpoint). By the end, tools from multiple services appear as a single unified MCP catalogue.

::: tip When to use these modes together
In multi-team environments, each team owns their own `conversion-only` plugin and REST service. They tag their tools with a shared identifier. A single `listener` plugin binds all matching tags and exposes them on one MCP endpoint - without any team knowing about the others.
:::

---

## What you'll have at the end

```
Team A  ──── conversion-only (tag: "internal-tools") ──── REST backend A
Team B  ──── conversion-only (tag: "internal-tools") ──── REST backend B
                    │
                    │  listener aggregates by tag
                    ▼
GET /mcp/all-tools  ──── returns tools from Team A + Team B
```

---

## Before you start

Labs 01-A and 01-B must be completed. The `mcp-backend` Service and `mcp-conversion` route already exist.

```bash
curl -s http://localhost:8001/routes/mcp-conversion | jq '.name'
# "mcp-conversion"
```

---

## Step 1 - Create a `conversion-only` plugin (10 min)

`conversion-only` needs a Route to be scoped to, but that route is never exposed to MCP clients - it's an internal anchor.

### Create the anchor route

```bash
curl -s -X POST http://localhost:8001/services/mcp-backend/routes \
  -H "Content-Type: application/json" \
  -d '{
    "name": "mcp-weather-def",
    "paths": ["/internal/weather-tools"],
    "methods": ["POST"],
    "strip_path": false,
    "tags": ["module-01", "internal"]
  }' | jq '{id, name}'
```

### Attach `conversion-only`

::: code-group

```bash [Admin API]
curl -s -X POST http://localhost:8001/routes/mcp-weather-def/plugins \
  -H "Content-Type: application/json" \
  -d '{
    "name": "ai-mcp-proxy",
    "config": {
      "mode": "conversion-only",
      "upstream_path": "/mcp/tools",
      "tags": ["weather-tools-v1"],
      "timeout": 30000
    }
  }' | jq '{id, name, config: .config.mode}'
```

```yaml [kong.yaml]
routes:
  - name: mcp-weather-def
    paths: [/internal/weather-tools]
    methods: [POST]
    strip_path: false
    tags: [module-01, internal]
    plugins:
      - name: ai-mcp-proxy
        config:
          mode: conversion-only
          upstream_path: /mcp/tools
          tags: [weather-tools-v1]
          timeout: 30000
```

:::

::: info `conversion-only` behaviour
- Kong creates the plugin and registers the tool definitions internally
- No MCP endpoint is served on `/internal/weather-tools` - clients hitting it get no MCP response
- The tools are only accessible when a `listener` plugin references the same `tags` value
:::

**✅ Checkpoint.** Plugin created. `curl -X POST http://localhost:8000/internal/weather-tools -d '{...}'` returns no MCP response (the route is unreachable for MCP purposes).

---

## Step 2 - Create a second `conversion-only` plugin (simulating Team B) (5 min)

```bash
curl -s -X POST http://localhost:8001/services/mcp-backend/routes \
  -H "Content-Type: application/json" \
  -d '{
    "name": "mcp-flights-def",
    "paths": ["/internal/flight-tools"],
    "methods": ["POST"],
    "strip_path": false,
    "tags": ["module-01", "internal"]
  }' | jq '{id, name}'
```

::: code-group

```bash [Admin API]
curl -s -X POST http://localhost:8001/routes/mcp-flights-def/plugins \
  -H "Content-Type: application/json" \
  -d '{
    "name": "ai-mcp-proxy",
    "config": {
      "mode": "conversion-only",
      "upstream_path": "/mcp/tools",
      "tags": ["weather-tools-v1"],
      "timeout": 30000
    }
  }' | jq '{id, name, config: .config.mode}'
```

```yaml [kong.yaml]
routes:
  - name: mcp-flights-def
    paths: [/internal/flight-tools]
    methods: [POST]
    strip_path: false
    plugins:
      - name: ai-mcp-proxy
        config:
          mode: conversion-only
          upstream_path: /mcp/tools
          tags: [weather-tools-v1]
          timeout: 30000
```

:::

**✅ Checkpoint.** Two `conversion-only` plugins exist, both tagged `weather-tools-v1`.

---

## Step 3 - Create a `listener` to aggregate them (10 min)

The `listener` creates the actual MCP endpoint. It binds to `conversion-only` plugins by matching the `server.tag` with their `tags`.

### Create the aggregation route

```bash
curl -s -X POST http://localhost:8001/services/mcp-backend/routes \
  -H "Content-Type: application/json" \
  -d '{
    "name": "mcp-unified",
    "paths": ["/mcp/all-tools"],
    "methods": ["POST", "GET"],
    "strip_path": false,
    "tags": ["module-01"]
  }' | jq '{id, name}'
```

### Attach `listener`

::: code-group

```bash [Admin API]
curl -s -X POST http://localhost:8001/routes/mcp-unified/plugins \
  -H "Content-Type: application/json" \
  -d '{
    "name": "ai-mcp-proxy",
    "config": {
      "mode": "listener",
      "timeout": 30000,
      "server": {
        "name": "unified-travel-mcp",
        "description": "All travel tools aggregated from team services",
        "version": "1.0.0",
        "tag": "weather-tools-v1"
      },
      "include_consumer_groups": true
    }
  }' | jq '{id, name, config: .config.mode}'
```

```yaml [kong.yaml]
routes:
  - name: mcp-unified
    paths: [/mcp/all-tools]
    methods: [POST, GET]
    strip_path: false
    plugins:
      - name: ai-mcp-proxy
        config:
          mode: listener
          timeout: 30000
          server:
            name: unified-travel-mcp
            description: All travel tools aggregated from team services
            version: 1.0.0
            tag: weather-tools-v1
          include_consumer_groups: true
```

:::

::: warning `include_consumer_groups: true`
Always set this on `listener` mode when using ACL rules. Without it, the listener cannot pass Consumer Group membership to the aggregated tools and ACL checks fail silently.
:::

**✅ Checkpoint.** `curl -s http://localhost:8001/routes/mcp-unified/plugins | jq '.data[0].config.mode'` returns `"listener"`.

---

## Step 4 - Test the aggregated endpoint (5 min)

```bash
# Tools from both conversion-only plugins appear in one list
curl -s -X POST http://localhost:8000/mcp/all-tools \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' \
  | jq '.result.tools[] | {name}'

# Call a tool through the aggregated endpoint
curl -s -X POST http://localhost:8000/mcp/all-tools \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {"name": "get_weather", "arguments": {"airport": "JFK"}}
  }' | jq '.result.content[0].text | fromjson'
```

**✅ Checkpoint.** `tools/list` on `/mcp/all-tools` returns tools from all tagged `conversion-only` plugins. `tools/call` works through the unified endpoint.

---

## How the three modes fit together

```
conversion-only  ──┐
  tag: "my-tools"  │
                   │  listener binds by tag
conversion-only  ──┤  server.tag: "my-tools"
  tag: "my-tools"  │
                   │
                   └──▶ POST /mcp/all-tools (listener endpoint)
                              ↓
                    MCP Client sees unified tool list
```

| Mode | Has MCP endpoint? | Converts REST? | Needed by |
|---|---|---|---|
| `conversion-only` | ❌ | ✅ | `listener` via tag |
| `listener` | ✅ | ❌ | MCP clients |
| `conversion-listener` | ✅ | ✅ | Standalone REST→MCP |
| `passthrough-listener` | ✅ | ❌ | Existing MCP servers |

---

## Exit ticket

1. A `listener` plugin has `server.tag: "billing-tools"`. A `conversion-only` plugin has `tags: ["billing-tools", "v2"]`. Does the listener pick it up? Why?
2. What happens if you delete a `conversion-only` plugin - do its tools disappear from the `listener` endpoint automatically?
3. Why is `include_consumer_groups: true` necessary in the `listener` config when using ACLs?

---

## Common pitfalls

| Symptom | Likely cause |
|---|---|
| `listener` returns empty tools list | `server.tag` on listener ≠ `tags` value on conversion-only plugins |
| `conversion-only` route returns 404 | Expected - it's not meant to serve clients directly |
| ACL allows all consumers on `listener` | `include_consumer_groups: false` or not set |
| Tool appears twice in unified list | Two `conversion-only` plugins define a tool with the same `name` under the same tag |

---

*Module 01 complete. Next: [Module 02 - MCP + OAuth2 →](/module-02-mcp-oauth2/)*
