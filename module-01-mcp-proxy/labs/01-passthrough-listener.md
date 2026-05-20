# Lab 01-A - Passthrough Listener

> **Goal.** In ~25 minutes you'll configure Kong's `ai-mcp-proxy` plugin in `passthrough-listener` mode. Kong becomes the secure, observable front-door for an existing MCP server - forwarding MCP requests unchanged while applying auth, rate limiting, and tracing.

::: tip When to use `passthrough-listener`
You already operate an MCP server (the Express travel backend here, or a third-party SaaS MCP service). You want Kong Gateway to act as the entrypoint that enforces authentication, rate limiting, and observability - without touching the MCP payload.
:::

---

## What you'll have at the end

- `POST /mcp/passthrough` accepts MCP JSON-RPC requests from any client
- Kong forwards requests unchanged to the upstream MCP server
- Rate limiting applied - 60 tool calls per minute
- MCP observability metrics (`kong.ai.mcp.*`) generated on every request

---

## Before you start

```bash
# Verify Kong 3.14 is running
curl -s http://localhost:8001 | jq '.version'
# "3.14.x"

# Verify MCP backend is up
curl -s -X POST http://localhost:3001/mcp/tools \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' \
  | jq '[.result.tools[].name]'
# ["search_flights","book_flight","get_weather","search_hotels","book_hotel"]
```

---

## Step 1 - Create the MCP Service (3 min)

::: code-group

```bash [Admin API]
curl -s -X POST http://localhost:8001/services \
  -H "Content-Type: application/json" \
  -d '{
    "name": "mcp-backend",
    "host": "host.docker.internal",
    "port": 3001,
    "protocol": "http",
    "tags": ["module-01", "mcp"]
  }' | jq '{id, name}'
```

```yaml [kong.yaml]
_format_version: '3.0'
services:
  - name: mcp-backend
    host: host.docker.internal
    port: 3001
    protocol: http
    tags: [module-01, mcp]
```

:::

**✅ Checkpoint.** `curl -s http://localhost:8001/services/mcp-backend | jq '.name'` returns `"mcp-backend"`.

---

## Step 2 - Create the passthrough route (2 min)

```bash
curl -s -X POST http://localhost:8001/services/mcp-backend/routes \
  -H "Content-Type: application/json" \
  -d '{
    "name": "mcp-passthrough",
    "paths": ["/mcp/passthrough"],
    "methods": ["POST", "GET"],
    "strip_path": false,
    "tags": ["module-01"]
  }' | jq '{id, name}'
```

**✅ Checkpoint.** `curl -s http://localhost:8001/routes/mcp-passthrough | jq '.name'` returns `"mcp-passthrough"`.

---

## Step 3 - Enable `passthrough-listener` (5 min)

::: code-group

```bash [Admin API]
curl -s -X POST http://localhost:8001/routes/mcp-passthrough/plugins \
  -H "Content-Type: application/json" \
  -d '{
    "name": "ai-mcp-proxy",
    "config": {
      "mode": "passthrough-listener",
      "upstream_path": "/mcp/tools",
      "timeout": 30000
    }
  }' | jq '{id, name, config: .config.mode}'
```

```yaml [kong.yaml]
_format_version: '3.0'
services:
  - name: mcp-backend
    host: host.docker.internal
    port: 3001
    protocol: http
    routes:
      - name: mcp-passthrough
        paths: [/mcp/passthrough]
        methods: [POST, GET]
        strip_path: false
        plugins:
          - name: ai-mcp-proxy
            config:
              mode: passthrough-listener
              upstream_path: /mcp/tools
              timeout: 30000
```

:::

::: info Config field reference
| Field | Description |
|---|---|
| `mode` | `passthrough-listener` - forwards MCP payloads unchanged |
| `upstream_path` | Path on the upstream MCP server that handles JSON-RPC |
| `timeout` | Milliseconds before Kong aborts the upstream call |
:::

**✅ Checkpoint.** `curl -s http://localhost:8001/routes/mcp-passthrough/plugins | jq '.data[0].config.mode'` returns `"passthrough-listener"`.

---

## Step 4 - Test the MCP handshake (5 min)

```bash
# 1. MCP initialize handshake
curl -s -X POST http://localhost:8000/mcp/passthrough \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 0,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {"tools": {}},
      "clientInfo": {"name": "curl-test", "version": "1.0"}
    }
  }' | jq '{version: .result.protocolVersion, server: .result.serverInfo.name}'

# 2. List tools - Kong forwards MCP unchanged
curl -s -X POST http://localhost:8000/mcp/passthrough \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' \
  | jq '.result.tools[] | {name, description}'

# 3. Call a tool
curl -s -X POST http://localhost:8000/mcp/passthrough \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "get_weather",
      "arguments": {"airport": "LHR"}
    }
  }' | jq '.result.content[0].text | fromjson'
```

**✅ Checkpoint.** All three calls return valid MCP responses. Kong forwarded the payload without modifying it.

::: tip Verify passthrough - Kong didn't transform anything
Compare the direct backend call vs. the Kong-proxied call - the JSON-RPC response should be byte-for-byte identical:

```bash
# Direct
curl -s -X POST http://localhost:3001/mcp/tools \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' \
  | jq '.result.tools[].name'

# Via Kong passthrough
curl -s -X POST http://localhost:8000/mcp/passthrough \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' \
  | jq '.result.tools[].name'
```

Same output - Kong is transparent to the protocol.
:::

---

## Step 5 - Add rate limiting (5 min)

Standard Kong plugins layer on top of any `ai-mcp-proxy` route without special configuration:

::: code-group

```bash [Admin API]
curl -s -X POST http://localhost:8001/routes/mcp-passthrough/plugins \
  -H "Content-Type: application/json" \
  -d '{
    "name": "rate-limiting",
    "config": {
      "minute": 60,
      "policy": "local",
      "fault_tolerant": true
    }
  }' | jq '{id, name}'
```

```yaml [kong.yaml - append to route plugins]
plugins:
  - name: rate-limiting
    config:
      minute: 60
      policy: local
      fault_tolerant: true
```

:::

```bash
# Confirm rate-limit headers appear on MCP calls
curl -si -X POST http://localhost:8000/mcp/passthrough \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' \
  | grep -i "x-ratelimit"
# X-RateLimit-Limit-Minute: 60
# X-RateLimit-Remaining-Minute: 59
```

**✅ Checkpoint.** `X-RateLimit-Remaining-Minute` header decrements on each tool call.

---

## Step 6 - Add key-auth to protect the endpoint (5 min)

::: code-group

```bash [Admin API]
# Create a Consumer for the agent
curl -s -X POST http://localhost:8001/consumers \
  -H "Content-Type: application/json" \
  -d '{"username":"travel-agent","tags":["module-01"]}' \
  | jq '{id, username}'

# Assign an API key
curl -s -X POST http://localhost:8001/consumers/travel-agent/key-auth \
  -H "Content-Type: application/json" \
  -d '{"key":"agent-key-passthrough-001"}' \
  | jq '{key, consumer: .consumer.username}'

# Attach key-auth to the route
curl -s -X POST http://localhost:8001/routes/mcp-passthrough/plugins \
  -H "Content-Type: application/json" \
  -d '{
    "name": "key-auth",
    "config": {"key_names": ["X-API-Key"], "hide_credentials": true}
  }' | jq '{id, name}'
```

```yaml [kong.yaml - append consumer + plugin]
consumers:
  - username: travel-agent
    tags: [module-01]
    keyauth_credentials:
      - key: agent-key-passthrough-001

services:
  - name: mcp-backend
    routes:
      - name: mcp-passthrough
        plugins:
          - name: key-auth
            config:
              key_names: [X-API-Key]
              hide_credentials: true
```

:::

```bash
# No key - expect 401
curl -si -X POST http://localhost:8000/mcp/passthrough \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' \
  | head -1
# HTTP/1.1 401 Unauthorized

# With key - expect 200 + tools
curl -s -X POST http://localhost:8000/mcp/passthrough \
  -H "Content-Type: application/json" \
  -H "X-API-Key: agent-key-passthrough-001" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' \
  | jq '.result.tools[].name'
```

**✅ Checkpoint.** No key → `401`. With key → tool names returned.

---

## What makes `passthrough-listener` unique

| Behaviour | Value |
|---|---|
| Route scoping required? | No - can be applied to a Service or Route |
| Modifies MCP payload? | Never - forwards byte-for-byte |
| Generates MCP metrics? | Yes - `kong.ai.mcp.*` observability metrics |
| Converts REST → MCP? | No |
| Compatible with standard Kong plugins? | Yes - key-auth, rate-limiting, OTel, etc. |

---

*Next: [Lab 01-B: Conversion Listener →](./01-conversion-listener)*
