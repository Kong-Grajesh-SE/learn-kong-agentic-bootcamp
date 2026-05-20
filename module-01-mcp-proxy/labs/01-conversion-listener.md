# Lab 01-B - Conversion Listener

> **Goal.** In ~35 minutes you'll configure Kong's `ai-mcp-proxy` plugin in `conversion-listener` mode. Kong reads your REST API's OpenAPI schema and auto-generates MCP tool definitions - so VS Code, Claude, and any MCP client can discover and invoke your REST endpoints without you building an MCP server.

::: tip When to use `conversion-listener`
You have an existing REST API and want to expose it to MCP clients through Kong, without changing the upstream. This is the most common mode for teams converting existing services to the agentic AI ecosystem.
:::

---

## What you'll have at the end

- `POST /mcp/tools` accepts MCP JSON-RPC - `tools/list` returns auto-generated tool definitions from the REST API, `tools/call` executes the mapped REST operation and wraps the response in MCP format
- ACL rules controlling which Consumers can discover and invoke which tools
- Rate limiting on the MCP endpoint

```
MCP Client
    │ tools/list  ──▶  Kong reads REST API → returns MCP tool defs
    │ tools/call  ──▶  Kong maps to HTTP endpoint → calls REST API → wraps response in MCP
    ▼
Kong ai-mcp-proxy (conversion-listener)
    │
    ▼
REST Backend (Express :3001/mcp/tools)
```

---

## Before you start

Lab 01-A must be completed - the `mcp-backend` Service already exists.

```bash
curl -s http://localhost:8001/services/mcp-backend | jq '.name'
# "mcp-backend"
```

---

## Step 1 - Create the conversion route (3 min)

::: warning Route scoping required
`conversion-listener` **must** be scoped to a Route, not a Service. The plugin needs Route information to generate the tool path mappings. Attaching to a Service without a Route causes Kong to skip conversion and log a warning.
:::

::: code-group

```bash [Admin API]
curl -s -X POST http://localhost:8001/services/mcp-backend/routes \
  -H "Content-Type: application/json" \
  -d '{
    "name": "mcp-conversion",
    "paths": ["/mcp/tools"],
    "methods": ["POST", "GET"],
    "strip_path": false,
    "tags": ["module-01"]
  }' | jq '{id, name}'
```

```yaml [kong.yaml]
services:
  - name: mcp-backend
    routes:
      - name: mcp-conversion
        paths: [/mcp/tools]
        methods: [POST, GET]
        strip_path: false
        tags: [module-01]
```

:::

**✅ Checkpoint.** `curl -s http://localhost:8001/routes/mcp-conversion | jq '.name'` returns `"mcp-conversion"`.

---

## Step 2 - Enable `conversion-listener` (5 min)

::: code-group

```bash [Admin API]
curl -s -X POST http://localhost:8001/routes/mcp-conversion/plugins \
  -H "Content-Type: application/json" \
  -d '{
    "name": "ai-mcp-proxy",
    "config": {
      "mode": "conversion-listener",
      "upstream_path": "/mcp/tools",
      "timeout": 30000,
      "server": {
        "name": "travel-api",
        "description": "Kong Travel Tools MCP Server - auto-generated from REST",
        "version": "1.0.0",
        "tag": "travel-tools"
      }
    }
  }' | jq '{id, name, config: .config.mode}'
```

```yaml [kong.yaml]
routes:
  - name: mcp-conversion
    paths: [/mcp/tools]
    methods: [POST, GET]
    strip_path: false
    plugins:
      - name: ai-mcp-proxy
        config:
          mode: conversion-listener
          upstream_path: /mcp/tools
          timeout: 30000
          server:
            name: travel-api
            description: Kong Travel Tools MCP Server - auto-generated from REST
            version: 1.0.0
            tag: travel-tools
```

:::

::: info `server.tag` field
The `server.tag` value is used later by `listener` mode plugins (Lab 01-C) to discover and aggregate tools from this plugin. Think of it as a tool catalogue identifier.
:::

**✅ Checkpoint.** `curl -s http://localhost:8001/routes/mcp-conversion/plugins | jq '.data[0].config.mode'` returns `"conversion-listener"`.

---

## Step 3 - Test REST → MCP conversion (10 min)

```bash
# 1. List tools - Kong auto-generates from REST endpoints
curl -s -X POST http://localhost:8000/mcp/tools \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' \
  | jq '.result.tools[] | {name, description}'

# 2. Call search_flights - Kong maps to REST, wraps response in MCP
curl -s -X POST http://localhost:8000/mcp/tools \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "search_flights",
      "arguments": {"origin": "SFO", "destination": "LHR", "date": "2026-06-15"}
    }
  }' | jq '.result.content[0].text | fromjson | .[0]'

# 3. Call get_weather
curl -s -X POST http://localhost:8000/mcp/tools \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {"name": "get_weather", "arguments": {"airport": "LHR"}}
  }' | jq '.result.content[0].text | fromjson'

# 4. Book a flight
curl -s -X POST http://localhost:8000/mcp/tools \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 4,
    "method": "tools/call",
    "params": {
      "name": "book_flight",
      "arguments": {"flight_id": "AA100", "passenger": "Jane Doe"}
    }
  }' | jq '.result.content[0].text | fromjson'
```

**✅ Checkpoint.** `tools/list` returns tool names. Each `tools/call` returns structured travel data. Kong is converting MCP ↔ REST in both directions - no changes to the upstream.

::: tip What Kong does on `tools/call`
1. Receives the MCP JSON-RPC request
2. Matches the tool `name` to an OpenAPI operation
3. Converts `arguments` into an HTTP request (path params, query params, or body)
4. Calls the REST endpoint
5. Wraps the HTTP response body in MCP `content[0].text` format
6. Returns the MCP-formatted response to the client
:::

---

## Step 4 - Add ACL tool control (10 min)

`conversion-listener` supports per-tool ACL rules. Authenticated Consumers can be allowed or denied access to specific tools.

### Create Consumers and keys

::: code-group

```bash [Admin API]
# Consumer: premium tier - can use all tools including book_flight, book_hotel
curl -s -X POST http://localhost:8001/consumers \
  -H "Content-Type: application/json" \
  -d '{"username":"premium-agent","tags":["module-01"]}' | jq '{id, username}'

curl -s -X POST http://localhost:8001/consumers/premium-agent/key-auth \
  -H "Content-Type: application/json" \
  -d '{"key":"premium-key-001"}' | jq '{key}'

# Consumer: read-only tier - can search but not book
curl -s -X POST http://localhost:8001/consumers \
  -H "Content-Type: application/json" \
  -d '{"username":"readonly-agent","tags":["module-01"]}' | jq '{id, username}'

curl -s -X POST http://localhost:8001/consumers/readonly-agent/key-auth \
  -H "Content-Type: application/json" \
  -d '{"key":"readonly-key-002"}' | jq '{key}'
```

```yaml [kong.yaml - consumers]
consumers:
  - username: premium-agent
    tags: [module-01]
    keyauth_credentials:
      - key: premium-key-001
  - username: readonly-agent
    tags: [module-01]
    keyauth_credentials:
      - key: readonly-key-002
```

:::

### Attach key-auth + ACL to the route

::: code-group

```bash [Admin API]
# key-auth plugin
curl -s -X POST http://localhost:8001/routes/mcp-conversion/plugins \
  -H "Content-Type: application/json" \
  -d '{
    "name": "key-auth",
    "config": {"key_names": ["X-API-Key"], "hide_credentials": true}
  }' | jq '{id, name}'

# Update ai-mcp-proxy to add default_acl
PLUGIN_ID=$(curl -s http://localhost:8001/routes/mcp-conversion/plugins \
  | jq -r '.data[] | select(.name=="ai-mcp-proxy") | .id')

curl -s -X PATCH http://localhost:8001/plugins/$PLUGIN_ID \
  -H "Content-Type: application/json" \
  -d '{
    "config": {
      "mode": "conversion-listener",
      "upstream_path": "/mcp/tools",
      "timeout": 30000,
      "server": {"name": "travel-api", "version": "1.0.0", "tag": "travel-tools"},
      "default_acl": {
        "allow": ["premium-agent", "readonly-agent"]
      },
      "tools": [
        {
          "name": "book_flight",
          "acl": {"allow": ["premium-agent"]}
        },
        {
          "name": "book_hotel",
          "acl": {"allow": ["premium-agent"]}
        }
      ]
    }
  }' | jq '{id, name}'
```

```yaml [kong.yaml - ai-mcp-proxy with ACL]
plugins:
  - name: ai-mcp-proxy
    config:
      mode: conversion-listener
      upstream_path: /mcp/tools
      timeout: 30000
      server:
        name: travel-api
        version: 1.0.0
        tag: travel-tools
      default_acl:
        allow: [premium-agent, readonly-agent]
      tools:
        - name: book_flight
          acl:
            allow: [premium-agent]
        - name: book_hotel
          acl:
            allow: [premium-agent]
```

:::

### Test ACL enforcement

```bash
# readonly-agent: tools/list only shows search + weather (not booking tools)
curl -s -X POST http://localhost:8000/mcp/tools \
  -H "X-API-Key: readonly-key-002" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' \
  | jq '[.result.tools[].name]'
# ["search_flights","get_weather","search_hotels"]  ← booking tools hidden

# readonly-agent: book_flight → 403
curl -s -X POST http://localhost:8000/mcp/tools \
  -H "X-API-Key: readonly-key-002" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0", "id": 2,
    "method": "tools/call",
    "params": {"name": "book_flight", "arguments": {"flight_id": "AA100", "passenger": "Jane"}}
  }' | jq '{status: .status, message: .message}'
# {"status": 403, "message": "Forbidden"}

# premium-agent: book_flight → success
curl -s -X POST http://localhost:8000/mcp/tools \
  -H "X-API-Key: premium-key-001" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0", "id": 3,
    "method": "tools/call",
    "params": {"name": "book_flight", "arguments": {"flight_id": "AA100", "passenger": "Jane"}}
  }' | jq '.result.content[0].text | fromjson'
```

**✅ Checkpoint.** readonly-agent sees search tools in list but gets `403` on booking tools. premium-agent sees and calls all tools.

::: info ACL evaluation order
1. Deny list - if subject matches any `deny` entry → `403`
2. Allow list - if subject not in `allow` → `403`
3. No ACL configured on tool → falls back to `default_acl`
4. No ACL at all → allowed

Per-tool `acl` does NOT inherit `default_acl` - it's an all-or-nothing override.
:::

---

## Step 5 - Add rate limiting (3 min)

::: code-group

```bash [Admin API]
curl -s -X POST http://localhost:8001/routes/mcp-conversion/plugins \
  -H "Content-Type: application/json" \
  -d '{"name":"rate-limiting","config":{"minute":60,"policy":"local"}}' \
  | jq '{id, name}'
```

```yaml [kong.yaml]
plugins:
  - name: rate-limiting
    config:
      minute: 60
      policy: local
```

:::

**✅ Checkpoint.** `X-RateLimit-Remaining-Minute` header appears in MCP responses.

---

## How `conversion-listener` is different from `passthrough-listener`

| | `passthrough-listener` | `conversion-listener` |
|---|---|---|
| Modifies MCP payload? | Never | Yes - wraps REST responses into MCP format |
| Upstream must be MCP? | Yes | No - any REST/OpenAPI backend |
| Route scoping required? | No | Yes |
| ACL on individual tools? | No | Yes - per-tool `allow`/`deny` lists |
| Tools auto-generated? | No | Yes - from OpenAPI schema |

---

*Next: [Lab 01-C: Conversion-Only + Listener →](./01-conversion-aggregation)*
