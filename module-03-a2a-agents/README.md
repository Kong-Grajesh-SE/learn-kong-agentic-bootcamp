# Module 03 - A2A (Agent-to-Agent) Routing

> **The scenario.** A single AI agent can only do so much. Your travel orchestrator needs to search flights, book hotels, and check weather simultaneously - but each skill has a different upstream service, a different SLA, and a different team owning it.
>
> A2A (Agent-to-Agent) is Google's open standard for agents to discover and delegate to each other via HTTP. In the next ~40 minutes you'll configure Kong as the A2A router between an orchestrator and three specialised sub-agents - with key-auth, per-agent rate limits, and OpenTelemetry tracing.

## What you'll have at the end

- Agent Card discovery at `GET /.well-known/agent.json` (public, no auth)
- Three sub-agent routes: `flights`, `hotels`, `weather`
- Key-auth protecting agent-to-agent calls (`X-Agent-Key` header)
- Per-agent rate limits (30/min for flights and hotels, 60/min for weather)
- OpenTelemetry traces on all A2A traffic tagged with `service.name=kong-a2a-router`

```
User → Orchestrator Agent
             │
       "Plan my trip: SFO → LHR, June 15-22"
             │
    Kong A2A Router
    ├── GET  /.well-known/agent.json   → Agent Card (no auth)
    ├── POST /a2a/flights              → FlightSearchAgent (key-auth, 30/min)
    ├── POST /a2a/hotels               → HotelBookingAgent (key-auth, 30/min)
    └── POST /a2a/weather              → WeatherAgent (60/min)
```

## Who this module is for

You completed Module 01. Kong 3.14 is running. The MCP backend is up at `localhost:3001` with A2A sub-agent endpoints.

```bash
# Verify A2A backend
curl -s http://localhost:3001/a2a/agents | jq '.[].name'
```

## Three concepts you need today

| Concept | What it is | Why it matters |
|---|---|---|
| **Agent Card** | JSON document at `/.well-known/agent.json` that describes an agent's capabilities | Orchestrators fetch this to know what skills are available before delegating |
| **A2A message format** | Structured HTTP payload with `id`, `message.role`, and `message.parts` | The standard body shape for agent-to-agent task delegation |
| **Per-route rate limiting** | Different `rate-limiting` plugin configs on each sub-agent route | Flights are expensive (30/min), weather is cheap (60/min) - treat them differently |

## Labs

| Lab | Topic | Time |
|---|---|---|
| [03-A: A2A Routing](/module-03-a2a-agents/labs/03-a2a-routing) | Service, discovery, sub-agent routes, key-auth, rate limits, OTel tracing | ~40 min |

## A2A Agent Card format reference

```json
{
  "name": "TravelOrchestratorAgent",
  "description": "Multi-skill travel planning agent",
  "url": "http://localhost:8000/.well-known/agent.json",
  "version": "1.0.0",
  "capabilities": {
    "streaming": false,
    "pushNotifications": false
  },
  "skills": [
    {
      "id": "flight-search",
      "name": "Search Flights",
      "description": "Search available flights between airports",
      "inputModes": ["text"],
      "outputModes": ["text", "data"]
    }
  ],
  "authentication": {
    "schemes": ["bearer"]
  }
}
```

## A2A message format reference

```json
{
  "id": "task-001",
  "message": {
    "role": "user",
    "parts": [
      {"type": "text", "text": "Find round-trip flights SFO to LHR in June 2026"}
    ]
  }
}
```

## Exit ticket

1. The Agent Card at `/.well-known/agent.json` has no auth. Why is that intentional in the A2A spec?
2. You want a single rate limit shared across all three sub-agent routes. Where do you attach the `rate-limiting` plugin instead of per-route?
3. OpenTelemetry is attached at the Service level. What is the difference between attaching it at Service scope vs. Route scope for distributed tracing?

## Common pitfalls

| Symptom | Likely cause |
|---|---|
| `/.well-known/agent.json` returns `404` | Regex route path not escaped - use `~/.well-known/agent\.json$` |
| Agent key works in curl but fails from orchestrator | Orchestrator sends key in a different header - verify `key_names` config |
| Rate-limit headers missing | Plugin attached to the Service, not individual Routes |
| OTel traces not in Jaeger | `otel-collector` container not running, or endpoint URL is wrong |

---

*Previous: [Module 02 - MCP + OAuth2](/module-02-mcp-oauth2/) · Next: [Module 04 - AI Custom Guardrail →](/module-04-custom-guardrail/)*
