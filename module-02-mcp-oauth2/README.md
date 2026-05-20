# Module 02 - MCP + OAuth2 / PKCE

> **The scenario.** The unauthenticated MCP endpoint from Module 01 is fine for internal demos. But connecting VS Code Copilot and Claude Desktop to it in production means any user, any agent, any script can invoke your tools. You need real identity on every tool call.
>
> In the next ~45 minutes you'll secure the MCP endpoint with OAuth2 Authorization Code + PKCE, validated by Keycloak. VS Code and Claude will trigger a browser login before they can list or invoke a single tool.

## What you'll have at the end

- `POST /mcp-oauth/tools` requires a valid Bearer token - no token, no tools
- Keycloak as the OIDC identity provider with a dedicated `mcp-oauth-client`
- VS Code GitHub Copilot connected to the secured MCP endpoint via OAuth2 PKCE
- Claude Desktop configured to authenticate through Keycloak
- A curl-testable token flow for CI pipelines and debugging

```
VS Code / Claude Desktop
        │
        ▼  OAuth2 Authorization Code + PKCE
GET /oauth2/authorize ──────────▶ Keycloak login page
        │
Keycloak issues authorization code
        │
Client exchanges code + PKCE verifier ──▶ access token
        │
POST /mcp-oauth/tools  Authorization: Bearer <token>
        │
Kong ai-mcp-oauth2 validates token (JWKS from Keycloak)
        │
Kong ai-mcp-proxy (passthrough-listener) ──▶ Express MCP server
```

## Who this module is for

You completed Module 01. The `mcp-backend` Service is running. Keycloak is up at `http://localhost:8080` with the `workshop` realm (see [Prerequisites](/prerequisites)).

```bash
# Confirm Keycloak is running
curl -s http://localhost:8080/realms/workshop | jq '.realm'
# "workshop"
```

::: warning `ai-mcp-oauth2` requires Kong 3.14+
This plugin is part of the AI Gateway Enterprise offering. Confirm your Kong version and licence before starting.
:::

## Three concepts you need today

| Concept | What it is | Why it matters |
|---|---|---|
| **PKCE** | Proof Key for Code Exchange - a challenge/verifier pair added to the auth code flow | Prevents auth code interception for public clients (VS Code, Claude Desktop are PKCE-native) |
| **JWKS** | JSON Web Key Set - the public keys Kong fetches from Keycloak to verify JWTs | Kong validates every Bearer token against Keycloak's JWKS endpoint - no shared secrets |
| **Plugin pairing** | `ai-mcp-oauth2` must run alongside `ai-mcp-proxy` in `passthrough-listener` mode | OAuth2 validates identity; passthrough forwards the authenticated MCP request to the backend |

## Labs

| Lab | Topic | Time |
|---|---|---|
| [02-A: MCP OAuth2](/module-02-mcp-oauth2/labs/02-mcp-oauth2) | Configure the plugin, register Keycloak client, connect VS Code + Claude | ~45 min |

## Exit ticket

1. Why must `ai-mcp-oauth2` be paired with `passthrough-listener` and NOT `conversion-listener`?
2. What is the difference between the authorization code, the PKCE verifier, and the access token?
3. Kong validates the JWT locally using JWKS. What three claims does `verify_parameters: [aud, exp, iss]` check?
4. A user's access token expires. What does VS Code do next, and how is Keycloak involved?

## Common pitfalls

| Symptom | Likely cause |
|---|---|
| `401` even with a valid token | `verify_parameters` includes `aud` but the token audience doesn't match `client_id` |
| Keycloak redirect loop after login | `redirect_uri` in Kong plugin ≠ URI registered in Keycloak - must be exact match |
| VS Code Copilot shows tools but `tools/call` fails | `ai-mcp-proxy` mode is `conversion-listener` instead of `passthrough-listener` |
| `pkce_required` error | Client sent an auth code without a PKCE code verifier |
| Claude Desktop shows "authentication failed" | Client secret is wrong or expired - regenerate in Keycloak and update the plugin config |

---

*Previous: [Module 01 - MCP Proxy](/module-01-mcp-proxy/) · Next: [Module 03 - A2A Agents →](/module-03-a2a-agents/)*
