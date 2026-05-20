# Module 04 - AI Custom Guardrail

> **The scenario.** Your AI proxy is live. Agents and users are sending prompts - and your LLM is generating responses. But nothing is checking whether those prompts or responses cross a content policy line. A user sends a harmful request; the LLM may return unsafe content; and you have no audit trail of what was blocked or why.
>
> In the next ~50 minutes you'll add the `ai-custom-guardrail` plugin to your AI proxy route. Every prompt is sent to an external moderation service before reaching the LLM. Every LLM response is inspected before reaching the user. Violations are blocked with a structured error message, and a full audit metric trail is written on every decision.

## What you'll have at the end

- `ai-custom-guardrail` intercepting requests (INPUT phase) and LLM responses (OUTPUT phase)
- A configurable guardrail service integration (works with Mistral Moderation, Azure Content Safety, or your own HTTP classifier)
- Dynamic block messages that identify which phase triggered the block
- Custom metrics logged per blocked or masked request

```
Client
  │
  ▼
Kong  ──► ai-custom-guardrail (INPUT phase)
              │
              ├── Send prompt body to guardrail service
              ├── BLOCK → return 400 to client (LLM never called)
              └── ALLOW → forward to ai-proxy / ai-proxy-advanced
                               │
                               ▼
                         LLM Provider
                               │
                               ▼
                    ai-custom-guardrail (OUTPUT phase)
                               │
                               ├── Send response body to guardrail service
                               ├── BLOCK → return 400 (response discarded)
                               └── ALLOW → return to client
```

## Who this module is for

You completed Module 01. An AI proxy route (`/ai/proxy/chat`) with `ai-proxy-advanced` is running. A guardrail service is reachable at `localhost:4000`.

::: warning Requires `ai-proxy` or `ai-proxy-advanced` first
`ai-custom-guardrail` extends the AI proxy flow. It **cannot** run standalone - `ai-proxy` or `ai-proxy-advanced` must be configured on the same Route before adding this plugin.

Minimum Kong version: **3.14**.
:::

## Three concepts you need today

| Concept | What it is | Why it matters |
|---|---|---|
| **INPUT/OUTPUT phases** | The plugin runs twice per request: once before the LLM (INPUT) and once after (OUTPUT) | You can block before the LLM is ever called, and also inspect what the LLM said before returning it |
| **Template variables** | `$(content)`, `$(source)`, `$(resp)`, `$(conf)` - built-in values Kong injects | Used in `config.request.body` to send the right content to your guardrail service |
| **`config.response.block`** | A Lua/template expression that evaluates the guardrail service's JSON response | Set this to the boolean field in your guardrail service's response body |

## Labs

| Lab | Topic | Time |
|---|---|---|
| [04-A: Input Guardrail](/module-04-custom-guardrail/labs/04-input-guardrail) | Block harmful prompts before they reach the LLM | ~25 min |
| [04-B: Output Guardrail](/module-04-custom-guardrail/labs/04-output-guardrail) | Inspect LLM responses and add custom metrics | ~25 min |

## Template variable reference

| Variable | Phase | Value |
|---|---|---|
| `$(content)` | Both | Text being inspected - prompt body in INPUT, response body in OUTPUT |
| `$(source)` | Both | `INPUT` or `OUTPUT` - identifies which phase is running |
| `$(resp)` | Both | The guardrail service's HTTP response (Lua table in INPUT, string in OUTPUT) |
| `$(conf)` | Both | The plugin's full `config` field - access sub-fields via `$(conf.params.my_key)` |

## Exit ticket

1. What is the key difference between `ai-prompt-guard` and `ai-custom-guardrail`? When would you choose each?
2. A block happens in the OUTPUT phase. Does the LLM get called? Does the client receive the LLM's response?
3. `config.response.block` is set to `$(resp.flagged)`. Your guardrail service returns `{"blocked": true}`. Why does nothing get blocked?
4. You want to inspect prompts but NOT responses. What do you configure or leave unconfigured?

## Common pitfalls

| Symptom | Likely cause |
|---|---|
| Plugin fails to create | `ai-proxy` or `ai-proxy-advanced` not on the same Route |
| All requests blocked | `config.response.block` always evaluates truthy - field name mismatch with guardrail service response |
| Block message shows literal `$(resp.reason)` | Guardrail service doesn't return a `reason` field - inspect actual response with `jq` |
| OUTPUT phase never triggers | Requests are failing in INPUT phase first - resolve INPUT blocks first |
| Guardrail service returns `5xx` | Check `url`, auth headers, and request body template syntax |

---

*Previous: [Module 03 - A2A Agents](/module-03-a2a-agents/) · End of bootcamp - [Home →](/)*
