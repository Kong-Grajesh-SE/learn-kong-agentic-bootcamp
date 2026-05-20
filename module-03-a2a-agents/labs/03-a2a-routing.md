# Lab 03-A - A2A Routing

> **Goal.** In ~40 minutes you'll configure Kong as the router between an orchestrator agent and three specialised sub-agents. The gateway enforces identity (key-auth), controls call volume (rate-limiting per agent), and provides distributed tracing (OpenTelemetry).

---

## Before you start

```bash
# Kong 3.14+
curl -s http://localhost:8001 | jq '.version'

# A2A backend endpoints
curl -s http://localhost:3001/a2a/agents | jq '.[].name'

# Test a sub-agent directly
curl -s -X POST http://localhost:3001/a2a/flights \
  -H "Content-Type: application/json" \
  -d '{"id":"t1","message":{"role":"user","parts":[{"type":"text","text":"SFO to LHR"}]}}' \
  | jq '.result.parts[0].text | fromjson | .[0]'
```

---

## Step 1 - Create the A2A Service (3 min)

::: code-group

```bash [Admin API]
curl -s -X POST http://localhost:8001/services \
  -H "Content-Type: application/json" \
  -d '{
    "name": "a2a-backend",
    "host": "host.docker.internal",
    "port": 3001,
    "protocol": "http",
    "tags": ["module-03", "a2a"]
  }' | jq '{id, name}'
```

```yaml [kong.yaml]
_format_version: '3.0'
services:
  - name: a2a-backend
    host: host.docker.internal
    port: 3001
    protocol: http
    tags: [module-03, a2a]
```

:::

**✅ Checkpoint.** `curl -s http://localhost:8001/services/a2a-backend | jq '.name'` returns `"a2a-backend"`.

---

## Step 2 - Create the Agent Card discovery route (5 min)

The Agent Card at `/.well-known/agent.json` is a public endpoint - no auth. Orchestrators fetch it to discover what skills are available.

```bash
curl -s -X POST http://localhost:8001/services/a2a-backend/routes \
  -H "Content-Type: application/json" \
  -d '{
    "name": "a2a-discovery",
    "paths": ["~/.well-known/agent\\.json$"],
    "methods": ["GET"],
    "strip_path": false,
    "tags": ["module-03", "a2a"]
  }' | jq '{id, name}'
```

::: tip Regex escaping in route paths
The `.` in `agent.json` must be escaped as `\\.` in the JSON string (which becomes `\.` in the actual regex). Without escaping, `.` matches any character and could match unintended paths.
:::

```bash
# Test Agent Card discovery
curl -s http://localhost:8000/.well-known/agent.json | jq '{
  name: .name,
  description: .description,
  skills: [.skills[].id]
}'
```

Expected:
```json
{
  "name": "TravelOrchestratorAgent",
  "description": "Multi-skill travel planning agent",
  "skills": ["flight-search", "hotel-booking", "weather-check"]
}
```

**✅ Checkpoint.** Agent Card returns with skill list - no auth headers required.

---

## Step 3 - Create sub-agent routes (5 min)

::: code-group

```bash [Admin API]
for AGENT in flights hotels weather; do
  curl -s -X POST http://localhost:8001/services/a2a-backend/routes \
    -H "Content-Type: application/json" \
    -d "{
      \"name\": \"a2a-${AGENT}\",
      \"paths\": [\"/a2a/${AGENT}\"],
      \"methods\": [\"POST\"],
      \"strip_path\": false,
      \"tags\": [\"module-03\", \"a2a\"]
    }" | jq '{id, name}'
done
```

```yaml [kong.yaml]
services:
  - name: a2a-backend
    host: host.docker.internal
    port: 3001
    protocol: http
    tags: [module-03, a2a]
    routes:
      - name: a2a-discovery
        paths: [~/.well-known/agent\.json$]
        methods: [GET]
        strip_path: false

      - name: a2a-flights
        paths: [/a2a/flights]
        methods: [POST]
        strip_path: false

      - name: a2a-hotels
        paths: [/a2a/hotels]
        methods: [POST]
        strip_path: false

      - name: a2a-weather
        paths: [/a2a/weather]
        methods: [POST]
        strip_path: false
```

:::

**✅ Checkpoint.** All three routes created. `curl -s http://localhost:8001/services/a2a-backend/routes | jq '[.data[].name]'` lists four routes (including discovery).

---

## Step 4 - Add key-auth to agent-to-agent calls (5 min)

Agent-to-agent calls must be authenticated. Create an orchestrator Consumer and protect the flights and hotels routes (high-value tools).

::: code-group

```bash [Admin API]
# Create orchestrator Consumer
curl -s -X POST http://localhost:8001/consumers \
  -H "Content-Type: application/json" \
  -d '{"username":"orchestrator-agent","tags":["module-03"]}' \
  | jq '{id, username}'

# Assign agent key
curl -s -X POST http://localhost:8001/consumers/orchestrator-agent/key-auth \
  -H "Content-Type: application/json" \
  -d '{"key":"orchestrator-key-xyz"}' \
  | jq '{key, consumer: .consumer.username}'

# Attach key-auth to flights route
curl -s -X POST http://localhost:8001/routes/a2a-flights/plugins \
  -H "Content-Type: application/json" \
  -d '{"name":"key-auth","config":{"key_names":["X-Agent-Key"],"hide_credentials":true}}' \
  | jq '{id, name}'

# Attach key-auth to hotels route
curl -s -X POST http://localhost:8001/routes/a2a-hotels/plugins \
  -H "Content-Type: application/json" \
  -d '{"name":"key-auth","config":{"key_names":["X-Agent-Key"],"hide_credentials":true}}' \
  | jq '{id, name}'
```

```yaml [kong.yaml - consumers + route plugins]
consumers:
  - username: orchestrator-agent
    tags: [module-03]
    keyauth_credentials:
      - key: orchestrator-key-xyz

services:
  - name: a2a-backend
    routes:
      - name: a2a-flights
        plugins:
          - name: key-auth
            config:
              key_names: [X-Agent-Key]
              hide_credentials: true
      - name: a2a-hotels
        plugins:
          - name: key-auth
            config:
              key_names: [X-Agent-Key]
              hide_credentials: true
```

:::

```bash
# Without key - 401
curl -si -X POST http://localhost:8000/a2a/flights \
  -H "Content-Type: application/json" \
  -d '{"id":"t1","message":{"role":"user","parts":[{"type":"text","text":"SFO to LHR"}]}}' \
  | head -1
# HTTP/1.1 401 Unauthorized

# With key - 200
curl -s -X POST http://localhost:8000/a2a/flights \
  -H "X-Agent-Key: orchestrator-key-xyz" \
  -H "Content-Type: application/json" \
  -d '{"id":"t1","message":{"role":"user","parts":[{"type":"text","text":"SFO to LHR June 15"}]}}' \
  | jq '.result.parts[0].text | fromjson | .[0]'
```

**✅ Checkpoint.** No key → `401`. With `X-Agent-Key: orchestrator-key-xyz` → flight results.

---

## Step 5 - Per-agent rate limiting (5 min)

Different sub-agents have different cost and SLA profiles. Apply limits per route:

::: code-group

```bash [Admin API]
# Flights: expensive - 30 calls/minute
curl -s -X POST http://localhost:8001/routes/a2a-flights/plugins \
  -H "Content-Type: application/json" \
  -d '{"name":"rate-limiting","config":{"minute":30,"policy":"local"}}' \
  | jq '{id, name}'

# Hotels: moderate - 30 calls/minute
curl -s -X POST http://localhost:8001/routes/a2a-hotels/plugins \
  -H "Content-Type: application/json" \
  -d '{"name":"rate-limiting","config":{"minute":30,"policy":"local"}}' \
  | jq '{id, name}'

# Weather: cheap - 60 calls/minute
curl -s -X POST http://localhost:8001/routes/a2a-weather/plugins \
  -H "Content-Type: application/json" \
  -d '{"name":"rate-limiting","config":{"minute":60,"policy":"local"}}' \
  | jq '{id, name}'
```

```yaml [kong.yaml - per-route rate limits]
routes:
  - name: a2a-flights
    plugins:
      - name: rate-limiting
        config: {minute: 30, policy: local}
  - name: a2a-hotels
    plugins:
      - name: rate-limiting
        config: {minute: 30, policy: local}
  - name: a2a-weather
    plugins:
      - name: rate-limiting
        config: {minute: 60, policy: local}
```

:::

```bash
# Confirm rate-limit headers on weather (no key required)
curl -si -X POST http://localhost:8000/a2a/weather \
  -H "Content-Type: application/json" \
  -d '{"id":"t3","message":{"role":"user","parts":[{"type":"text","text":"LHR weather"}]}}' \
  | grep -i "x-ratelimit"
# X-RateLimit-Limit-Minute: 60
# X-RateLimit-Remaining-Minute: 59
```

**✅ Checkpoint.** Each sub-agent route has its own rate limit. Flights and hotels show `Limit-Minute: 30`, weather shows `Limit-Minute: 60`.

---

## Step 6 - Test A2A task delegation (5 min)

```bash
# Delegate to flights sub-agent
curl -s -X POST http://localhost:8000/a2a/flights \
  -H "Content-Type: application/json" \
  -H "X-Agent-Key: orchestrator-key-xyz" \
  -d '{
    "id": "task-001",
    "message": {
      "role": "user",
      "parts": [{"type": "text", "text": "Find round-trip flights SFO to LHR June 15-22 2026"}]
    }
  }' | jq '.result.parts[0].text | fromjson | .[0]'

# Delegate to hotels sub-agent
curl -s -X POST http://localhost:8000/a2a/hotels \
  -H "Content-Type: application/json" \
  -H "X-Agent-Key: orchestrator-key-xyz" \
  -d '{
    "id": "task-002",
    "message": {
      "role": "user",
      "parts": [{"type": "text", "text": "Hotels near Heathrow June 15-22"}]
    }
  }' | jq '.result.parts[0].text | fromjson | .[0]'

# Delegate to weather sub-agent (no key required)
curl -s -X POST http://localhost:8000/a2a/weather \
  -H "Content-Type: application/json" \
  -d '{
    "id": "task-003",
    "message": {
      "role": "user",
      "parts": [{"type": "text", "text": "Weather at LHR June 15"}]
    }
  }' | jq '.result.parts[0].text | fromjson'
```

**✅ Checkpoint.** All three sub-agents return structured results. Flights without a key → `401`.

---

## Step 7 - Add OpenTelemetry tracing (5 min)

Attach at the Service level so every A2A request - across all sub-agents - is captured in one trace:

::: code-group

```bash [Admin API]
curl -s -X POST http://localhost:8001/services/a2a-backend/plugins \
  -H "Content-Type: application/json" \
  -d '{
    "name": "opentelemetry",
    "config": {
      "endpoint": "http://otel-collector:4318/v1/traces",
      "resource_attributes": {
        "service.name": "kong-a2a-router",
        "ai.agent.type": "orchestrator"
      }
    }
  }' | jq '{id, name}'
```

```yaml [kong.yaml]
services:
  - name: a2a-backend
    plugins:
      - name: opentelemetry
        config:
          endpoint: "http://otel-collector:4318/v1/traces"
          resource_attributes:
            service.name: kong-a2a-router
            ai.agent.type: orchestrator
```

:::

::: tip Why Service scope?
Attaching at the Service level means every Route under `a2a-backend` gets the same tracer. Individual span names still identify the specific sub-agent route. This gives you one trace per orchestrator call fan-out, correlated across all sub-agents.
:::

**✅ Checkpoint.** Jaeger / Zipkin shows traces tagged `service.name=kong-a2a-router` with child spans per sub-agent invocation.

---

*Module 03 complete. Next: [Module 04 - AI Custom Guardrail →](/module-04-custom-guardrail/)*
