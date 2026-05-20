# Lab 02-A - MCP + OAuth2 / PKCE

> **Goal.** In ~45 minutes you'll create a secured MCP route protected by `ai-mcp-oauth2` + Keycloak, then connect VS Code GitHub Copilot and Claude Desktop as authenticated MCP clients.

---

## Before you start

```bash
# Kong 3.14+
curl -s http://localhost:8001 | jq '.version'

# mcp-backend Service from Module 01 must exist
curl -s http://localhost:8001/services/mcp-backend | jq '.name'
# "mcp-backend"

# Keycloak workshop realm must be up
curl -s http://localhost:8080/realms/workshop | jq '.realm'
# "workshop"
```

---

## Step 1 - Create the OAuth2 MCP route (3 min)

This is a separate route from the unauthenticated routes in Module 01. Same backend, different security posture.

::: code-group

```bash [Admin API]
curl -s -X POST http://localhost:8001/services/mcp-backend/routes \
  -H "Content-Type: application/json" \
  -d '{
    "name": "mcp-oauth",
    "paths": ["/mcp-oauth/tools"],
    "methods": ["POST", "GET"],
    "strip_path": false,
    "tags": ["module-02", "oauth2"]
  }' | jq '{id, name}'
```

```yaml [kong.yaml]
_format_version: '3.0'
services:
  - name: mcp-backend
    routes:
      - name: mcp-oauth
        paths: [/mcp-oauth/tools]
        methods: [POST, GET]
        strip_path: false
        tags: [module-02, oauth2]
```

:::

**✅ Checkpoint.** `curl -s http://localhost:8001/routes/mcp-oauth | jq '.name'` returns `"mcp-oauth"`.

---

## Step 2 - Configure `ai-mcp-oauth2` + `ai-mcp-proxy` (5 min)

Both plugins must be on the same route. Apply `ai-mcp-oauth2` first (auth runs before proxy):

::: code-group

```bash [Admin API]
# Plugin 1: OAuth2 validation
curl -s -X POST http://localhost:8001/routes/mcp-oauth/plugins \
  -H "Content-Type: application/json" \
  -d '{
    "name": "ai-mcp-oauth2",
    "config": {
      "issuer": "http://localhost:8080/realms/workshop",
      "client_id": "mcp-oauth-client",
      "client_secret": "mcp-oauth-secret",
      "scopes": ["openid", "profile", "mcp-tools"],
      "redirect_uri": "http://localhost:8000/mcp-oauth/callback",
      "pkce_required": true,
      "token_endpoint_auth_method": "client_secret_post",
      "verify_parameters": ["aud", "exp", "iss"]
    }
  }' | jq '{id, name}'

# Plugin 2: MCP passthrough proxy
curl -s -X POST http://localhost:8001/routes/mcp-oauth/plugins \
  -H "Content-Type: application/json" \
  -d '{
    "name": "ai-mcp-proxy",
    "config": {
      "mode": "passthrough-listener",
      "upstream_path": "/mcp/tools",
      "timeout": 30000
    }
  }' | jq '{id, name}'
```

```yaml [kong.yaml]
routes:
  - name: mcp-oauth
    paths: [/mcp-oauth/tools]
    methods: [POST, GET]
    strip_path: false
    tags: [module-02, oauth2]
    plugins:
      - name: ai-mcp-oauth2
        config:
          issuer: "http://localhost:8080/realms/workshop"
          client_id: mcp-oauth-client
          client_secret: mcp-oauth-secret
          scopes: [openid, profile, mcp-tools]
          redirect_uri: "http://localhost:8000/mcp-oauth/callback"
          pkce_required: true
          token_endpoint_auth_method: client_secret_post
          verify_parameters: [aud, exp, iss]
      - name: ai-mcp-proxy
        config:
          mode: passthrough-listener
          upstream_path: /mcp/tools
          timeout: 30000
```

:::

::: info Plugin config reference
| Field | What it does |
|---|---|
| `issuer` | OIDC discovery URL - Kong fetches JWKS from `{issuer}/.well-known/openid-configuration` |
| `pkce_required` | Rejects auth flows without a PKCE code challenge |
| `verify_parameters` | JWT claims Kong validates on every request: `aud`, `exp`, `iss` |
| `token_endpoint_auth_method` | How the client authenticates at Keycloak's token endpoint |
:::

::: warning Pair with `passthrough-listener` only
`ai-mcp-oauth2` validates the Bearer token and populates consumer identity. It relies on `ai-mcp-proxy` in `passthrough-listener` mode to forward the authenticated request to the MCP backend. Do **not** use `conversion-listener` on this route - the two modes are not designed to be combined.
:::

**✅ Checkpoint.** No token → `401 Unauthorized`:

```bash
curl -si -X POST http://localhost:8000/mcp-oauth/tools \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' \
  | head -1
# HTTP/1.1 401 Unauthorized
```

---

## Step 3 - Register the Keycloak client (10 min)

### Option A - Admin Console (UI)

1. Open [http://localhost:8080/admin](http://localhost:8080/admin) → log in as `admin` / `admin`
2. Select realm **workshop** → **Clients** → **Create client**
3. **Client type**: OpenID Connect, **Client ID**: `mcp-oauth-client` → Next
4. Enable **Standard flow** (Authorization Code), disable **Direct access grants** → Next
5. Set **Valid redirect URIs**: `http://localhost:8000/mcp-oauth/callback` → Save
6. **Credentials** tab → copy the auto-generated **Client secret** → update `mcp-oauth-secret` in the Kong plugin
7. **Client scopes** → **Add client scope** → select or create `mcp-tools` → **Add (Default)**

### Option B - Keycloak REST API

```bash
# Get admin token
ADMIN_TOKEN=$(curl -s -X POST \
  http://localhost:8080/realms/master/protocol/openid-connect/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=password&client_id=admin-cli&username=admin&password=admin" \
  | jq -r '.access_token')

# Create client
curl -s -X POST http://localhost:8080/admin/realms/workshop/clients \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "mcp-oauth-client",
    "publicClient": false,
    "redirectUris": ["http://localhost:8000/mcp-oauth/callback"],
    "standardFlowEnabled": true,
    "directAccessGrantsEnabled": false,
    "defaultClientScopes": ["openid", "profile", "mcp-tools"]
  }' | jq '{id, clientId}'
```

**✅ Checkpoint.** `mcp-oauth-client` appears in Keycloak → Clients. The client secret is set in your Kong plugin config.

---

## Step 4 - Test with a Bearer token (curl) (5 min)

For CI pipelines and debugging, get a token via client credentials:

```bash
# Fetch token
TOKEN=$(curl -s -X POST \
  http://localhost:8080/realms/workshop/protocol/openid-connect/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials" \
  -d "client_id=mcp-oauth-client" \
  -d "client_secret=mcp-oauth-secret" \
  | jq -r '.access_token')

echo "Token (first 40 chars): ${TOKEN:0:40}..."

# Unauthenticated - 401
curl -si -X POST http://localhost:8000/mcp-oauth/tools \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' \
  | head -1
# HTTP/1.1 401 Unauthorized

# Authenticated - 200 + tools
curl -s -X POST http://localhost:8000/mcp-oauth/tools \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' \
  | jq '[.result.tools[].name]'
# ["search_flights","book_flight","get_weather","search_hotels","book_hotel"]
```

**✅ Checkpoint.** No token → `401`. Valid token → tool names listed.

---

## Step 5 - Connect VS Code GitHub Copilot (5 min)

Create `.vscode/mcp.json` in your workspace root:

```json
{
  "servers": {
    "kong-travel-mcp": {
      "type": "http",
      "url": "http://localhost:8000/mcp-oauth/tools",
      "headers": {
        "Content-Type": "application/json"
      },
      "auth": {
        "type": "oauth2",
        "authorizationUrl": "http://localhost:8080/realms/workshop/protocol/openid-connect/auth",
        "tokenUrl": "http://localhost:8080/realms/workshop/protocol/openid-connect/token",
        "clientId": "mcp-oauth-client",
        "scopes": ["openid", "profile", "mcp-tools"],
        "pkce": true
      }
    }
  }
}
```

1. `Ctrl+Shift+P` → **GitHub Copilot: Open MCP Tools** → `kong-travel-mcp` should appear
2. First tool call triggers the OAuth2 browser flow → log in with a Keycloak user → VS Code receives the access token

**✅ Checkpoint.** Ask Copilot: *"Search for flights from SFO to LHR on June 15"* - it invokes `search_flights` via the secured MCP endpoint and returns results.

---

## Step 6 - Connect Claude Desktop (5 min)

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "kong-travel": {
      "type": "http",
      "url": "http://localhost:8000/mcp-oauth/tools",
      "oauth": {
        "clientId": "mcp-oauth-client",
        "authorizationUrl": "http://localhost:8080/realms/workshop/protocol/openid-connect/auth",
        "tokenUrl": "http://localhost:8080/realms/workshop/protocol/openid-connect/token",
        "scopes": ["openid", "mcp-tools"],
        "pkce": true
      }
    }
  }
}
```

Restart Claude Desktop. The first MCP call opens a browser login. After authentication, Claude Desktop stores the token and refreshes it automatically.

**✅ Checkpoint.** Claude Desktop shows `kong-travel` in its MCP server list with a green indicator. Ask Claude: *"Find me a hotel near Heathrow for 3 nights from June 15"* - it invokes `search_hotels`.

---

## Route summary

| Route | Plugins | Auth | Use case |
|---|---|---|---|
| `POST /mcp/tools` | `ai-mcp-proxy` (conversion-listener) | None | Curl demos, internal dev |
| `POST /mcp-oauth/tools` | `ai-mcp-oauth2` + `ai-mcp-proxy` (passthrough) | OAuth2 + PKCE | VS Code, Claude, production agents |

---

*Module 02 complete. Next: [Module 03 - A2A Agents →](/module-03-a2a-agents/)*
