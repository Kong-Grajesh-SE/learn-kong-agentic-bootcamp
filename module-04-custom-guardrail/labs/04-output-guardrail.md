# Lab 04-B - Output Guardrail

> **Goal.** In ~25 minutes you'll extend the plugin from Lab 04-A to also inspect the LLM's response. You'll add the OUTPUT phase, include `$(source)` in block messages, and configure custom metrics so every guardrail decision writes an observable audit trail.

---

## Before you start

This lab continues from Lab 04-A. The `ai-custom-guardrail` plugin must already be on the `ai-proxy-chat` route with the INPUT phase configured.

```bash
# Verify plugin exists with request config
curl -s http://localhost:8001/routes/ai-proxy-chat/plugins \
  | jq '[.data[] | select(.name=="ai-custom-guardrail") | {id, name}]'
```

---

## Step 1 - Add the OUTPUT phase (8 min)

Patch the existing plugin to add `config.response` (the OUTPUT phase). You need the plugin's `id` first:

```bash
PLUGIN_ID=$(curl -s http://localhost:8001/routes/ai-proxy-chat/plugins \
  | jq -r '[.data[] | select(.name=="ai-custom-guardrail")][0].id')
echo "Plugin ID: $PLUGIN_ID"
```

::: code-group

```bash [Admin API - PATCH]
curl -s -X PATCH http://localhost:8001/plugins/$PLUGIN_ID \
  -H "Content-Type: application/json" \
  -d '{
    "config": {
      "request": {
        "url": "http://host.docker.internal:4000/moderate",
        "method": "POST",
        "headers": {"Content-Type": "application/json"},
        "body": "{\"input\": \"$(content)\", \"phase\": \"INPUT\"}",
        "response": {
          "block": "$(resp.flagged)",
          "block_status_code": 400,
          "block_message": "Content policy violation in $(source) phase: $(resp.reason)"
        }
      },
      "response": {
        "url": "http://host.docker.internal:4000/moderate",
        "method": "POST",
        "headers": {"Content-Type": "application/json"},
        "body": "{\"input\": \"$(content)\", \"phase\": \"OUTPUT\"}",
        "response": {
          "block": "$(resp.flagged)",
          "block_status_code": 400,
          "block_message": "Content policy violation in $(source) phase: $(resp.reason)"
        }
      }
    }
  }' | jq '{id, name}'
```

```yaml [kong.yaml - full plugin config]
routes:
  - name: ai-proxy-chat
    plugins:
      - name: ai-custom-guardrail
        config:
          request:
            url: "http://host.docker.internal:4000/moderate"
            method: POST
            headers:
              Content-Type: application/json
            body: '{"input": "$(content)", "phase": "INPUT"}'
            response:
              block: "$(resp.flagged)"
              block_status_code: 400
              block_message: "Content policy violation in $(source) phase: $(resp.reason)"
          response:
            url: "http://host.docker.internal:4000/moderate"
            method: POST
            headers:
              Content-Type: application/json
            body: '{"input": "$(content)", "phase": "OUTPUT"}'
            response:
              block: "$(resp.flagged)"
              block_status_code: 400
              block_message: "Content policy violation in $(source) phase: $(resp.reason)"
```

:::

::: info `config.request` vs `config.response`
| Field | Phase | Triggered |
|---|---|---|
| `config.request` | INPUT | Before the LLM is called - evaluates the user's prompt |
| `config.response` | OUTPUT | After the LLM responds - evaluates the model's completion |
:::

**✅ Checkpoint.** Both INPUT and OUTPUT phases now reject harmful content:

```bash
# OUTPUT phase test: simulate a response the LLM might generate
# (Your guardrail service needs to flag "dangerous content in response" style inputs)
# Test that a safe prompt → safe response returns normally
curl -s -X POST http://localhost:8000/ai/proxy/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"What is the weather like in Paris in June?"}]}' \
  | jq '.choices[0].message.content'
```

---

## Step 2 - Add custom metrics (5 min)

`config.metrics` lets you log custom key-value pairs on every guardrail decision. This creates an observable audit trail without changing your SIEM pipeline.

::: code-group

```bash [Admin API - PATCH]
curl -s -X PATCH http://localhost:8001/plugins/$PLUGIN_ID \
  -H "Content-Type: application/json" \
  -d '{
    "config": {
      "metrics": [
        {
          "name": "guardrail_phase",
          "value": "$(source)"
        },
        {
          "name": "guardrail_flagged",
          "value": "$(resp.flagged)"
        },
        {
          "name": "guardrail_reason",
          "value": "$(resp.reason)"
        }
      ]
    }
  }' | jq '{id, name}'
```

```yaml [kong.yaml - metrics section]
plugins:
  - name: ai-custom-guardrail
    config:
      metrics:
        - name: guardrail_phase
          value: "$(source)"
        - name: guardrail_flagged
          value: "$(resp.flagged)"
        - name: guardrail_reason
          value: "$(resp.reason)"
```

:::

::: tip Where do metrics appear?
Metrics appear in Kong's access log and in any connected observability pipeline (Prometheus, OpenTelemetry, Datadog). The `name` field becomes the metric key; `value` is the template expression. These are emitted on **every** request - not just blocked ones - so you get full audit coverage.
:::

**✅ Checkpoint.** Send a request and check Kong's access log for the metric fields:

```bash
curl -s -X POST http://localhost:8000/ai/proxy/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Plan a weekend trip to Rome"}]}' \
  | jq '.choices[0].message.content'

docker logs kong-dp 2>&1 | tail -20 | grep -i "guardrail"
```

---

## Step 3 - Mistral Moderation API example (5 min)

This is an alternative configuration using [Mistral's Moderation API](https://docs.mistral.ai/capabilities/guardrailing/) as the guardrail service. It demonstrates how to swap the backend without changing Kong's plugin structure.

::: info Example only - Mistral API key required
The steps below show the config pattern. You need a Mistral API key at `https://api.mistral.ai` to use it. The workshop defaults to the local `localhost:4000` service.
:::

```bash
# Mistral Moderation API response shape:
# { "id": "...", "model": "mistral-moderation-latest", "results": [{ "categories": {...}, "category_scores": {...} }] }

PLUGIN_ID=$(curl -s http://localhost:8001/routes/ai-proxy-chat/plugins \
  | jq -r '[.data[] | select(.name=="ai-custom-guardrail")][0].id')

curl -s -X PATCH http://localhost:8001/plugins/$PLUGIN_ID \
  -H "Content-Type: application/json" \
  -d '{
    "config": {
      "request": {
        "url": "https://api.mistral.ai/v1/moderations",
        "method": "POST",
        "headers": {
          "Content-Type": "application/json",
          "Authorization": "Bearer YOUR_MISTRAL_API_KEY"
        },
        "body": "{\"inputs\": [\"$(content)\"], \"model\": \"mistral-moderation-latest\"}",
        "response": {
          "block": "$(resp.results[0].categories.violence)",
          "block_status_code": 400,
          "block_message": "Request blocked by AI content policy ($(source))"
        }
      }
    }
  }' | jq '{id, name}'
```

::: warning Adjust `block` expression per moderation API
Each moderation API returns a different response schema:
- Local service: `$(resp.flagged)`
- Mistral: `$(resp.results[0].categories.violence)` (per-category boolean)
- Azure Content Safety: `$(resp.blocklistsMatch[0].blocklistName)` (truthy if matched)

Always inspect the raw response from your moderation API with `curl` before setting the `block` expression.
:::

---

## Step 4 - Full plugin config review (2 min)

Inspect the final plugin state:

```bash
curl -s http://localhost:8001/plugins/$PLUGIN_ID \
  | jq '{
    name,
    request_phase: .config.request.url,
    request_block_on: .config.request.response.block,
    response_phase: (.config.response.url // "not configured"),
    response_block_on: (.config.response.response.block // "not configured"),
    metrics: [.config.metrics[].name]
  }'
```

Expected:
```json
{
  "name": "ai-custom-guardrail",
  "request_phase": "http://host.docker.internal:4000/moderate",
  "request_block_on": "$(resp.flagged)",
  "response_phase": "http://host.docker.internal:4000/moderate",
  "response_block_on": "$(resp.flagged)",
  "metrics": ["guardrail_phase", "guardrail_flagged", "guardrail_reason"]
}
```

**✅ Checkpoint.** Both phases configured. Three custom metrics registered.

---

## Module 04 complete

You've built a full guardrail pipeline:
- **Lab 04-A**: INPUT phase blocks harmful prompts before the LLM is called
- **Lab 04-B**: OUTPUT phase inspects LLM responses; custom metrics provide an audit trail

### Agentic Bootcamp - all modules complete

| Module | Plugin | Skill |
|---|---|---|
| 01 - MCP Proxy | `ai-mcp-proxy` | 4 modes: passthrough-listener, conversion-listener, conversion-only, listener |
| 02 - MCP + OAuth2 | `ai-mcp-oauth2` | PKCE-secured MCP with Keycloak, VS Code and Claude Desktop clients |
| 03 - A2A Agents | `key-auth`, `rate-limiting`, `opentelemetry` | Agent Card discovery, agent-to-agent delegation with auth and tracing |
| 04 - Custom Guardrail | `ai-custom-guardrail` | INPUT + OUTPUT phases, template variables, custom metrics, Mistral Moderation |

---

*[← Back to Home](/)*
