# `@devdigest/mcp` — local MCP server

stdio MCP server that wraps the running DevDigest API (`http://localhost:3001`)
with five token-efficient tools. Course lesson **L04**.

## Important: not part of `./scripts/dev.sh`

**`./scripts/dev.sh` never starts this process.** It only brings up Postgres,
the API (`:3001`), and the web app (`:3000`). The MCP server is **opt-in**:
you start it only when a host (Cursor, Claude Code, MCP Inspector) needs the
tools.

| Process | Started by |
|---------|------------|
| Postgres + API + web | `./scripts/dev.sh` |
| MCP (`devdigest-mcp`) | Cursor/Claude via [`.mcp.json`](../.mcp.json), **or** manually with `npm start` / Inspector |

---

## From zero (detailed)

### 1. One-time machine setup

```sh
# From the repo root
node -v    # ≥ 22
npm -v     # comes with Node; used for this package (not pnpm)

cd devdigest-mcp
npm install
cd ..
```

You only need `npm install` again if `package.json` / lockfile change.

### 2. Start the DevDigest API (required for live tools)

MCP is an HTTP client. Without the API, read/write tools fail with a clear
connection error.

```sh
# From the repo root — does NOT start MCP
./scripts/dev.sh
# or API only:
./scripts/dev.sh --no-client
# or already running:
cd server && pnpm dev   # :3001
```

Confirm:

```sh
curl -s http://localhost:3001/health
```

If something else already owns `:3001` on your machine, start the API on another
port (e.g. `API_PORT=3011 pnpm dev` in `server/`) and set
`DEVDIGEST_API_BASE=http://localhost:3011` in [`.mcp.json`](../.mcp.json) or
your shell — do not commit a machine-specific port.

### 3. Choose how to run MCP

#### Option A — Cursor / Claude Code (usual day-to-day)

1. Repo root [`.mcp.json`](../.mcp.json) already points at this package:

   ```json
   {
     "mcpServers": {
       "devdigest": {
         "command": "npm",
         "args": ["run", "start", "--prefix", "devdigest-mcp"],
         "env": {
           "DEVDIGEST_API_BASE": "http://localhost:3001"
         }
       }
     }
   }
   ```

2. Open this repo in the host.
3. Ensure MCP is enabled for the project (Cursor: Settings → MCP; Claude Code:
   project `.mcp.json` is picked up automatically).
4. **Start a new chat** after first enable or after tool renames — hosts
   snapshot `tools/list` at session start.
5. The host spawns `npm run start --prefix devdigest-mcp` over **stdio** when
   it needs tools. You do **not** run a separate terminal for that.

To disable MCP without deleting the package: remove or rename `.mcp.json`, or
turn the `devdigest` server off in the host UI.

#### Option B — Manual stdio (debug / smoke)

In a **dedicated terminal** (leave API running in another):

```sh
cd devdigest-mcp
npm start
```

The process blocks on stdin waiting for JSON-RPC. Do not type into that
terminal. Stop with Ctrl-C.

#### Option C — MCP Inspector (interactive UI)

```sh
# Terminal 1: API
./scripts/dev.sh --no-client

# Terminal 2: Inspector (spawns MCP for you)
npx @modelcontextprotocol/inspector npm --prefix devdigest-mcp start
```

Open the Inspector URL it prints, then call tools from the UI.

### 4. Smoke-check the five tools

Against seeded / imported data (API must be up):

1. `list_agents` — expect General / Security (and any custom agents).
2. `run_agent_on_pr` — `repo_id` (UUID from UI or `GET /repos`), `pr_number`,
   `agent_id` from step 1. Blocks until done or **120s**.
3. `get_findings` — pass the `run_id` from step 2 (or from a timeout payload).
4. `get_conventions` — same `repo_id` (default status filter: `accepted`).
5. `get_blast_radius` — stub: `implemented: false`.

### 5. Tests (no API required)

```sh
cd devdigest-mcp
npm test
npm run typecheck
```

Hermetic Vitest with mocked `fetch` — no Docker, no API.

---

## Worked example: Security Reviewer on PR #19

Real run against imported GitHub PR
**[#19 DO NOT MERGE: refund lookup by charge reference](https://github.com/ollyholly/dev-digest/pull/19)**
on repo `ollyholly/dev-digest`, agent **Security Reviewer**.

### Resolve IDs (do not hard-code forever)

UUIDs change if you re-seed or re-import. Discover them each environment:

```sh
API="${DEVDIGEST_API_BASE:-http://localhost:3001}"

# Agents → pick Security Reviewer id
curl -s "$API/agents" | jq '.[] | {id,name}'

# Or via MCP
cd devdigest-mcp
DEVDIGEST_API_BASE="$API" node scripts/call-mcp-tool.mjs list_agents '{"enabled_only":true}'

# Repos → pick ollyholly/dev-digest id
curl -s "$API/repos" | jq '.[] | {id,full_name}'

# Confirm PR #19 is imported
REPO_ID=<uuid-from-above>
curl -s "$API/repos/$REPO_ID/pulls" | jq '.[] | select(.number==19) | {id,number,title}'
```

Example values from a local DB after import (yours may differ):

| Field | Example |
|-------|---------|
| `repo_id` | `e8acc918-6627-4f5b-a411-80d4d121b47e` (`ollyholly/dev-digest`) |
| `pr_number` | `19` |
| `agent_id` | `f1b2f6ed-5019-4772-b318-5593a9285e8c` (Security Reviewer) |

### Call `run_agent_on_pr`

**MCP tool arguments (verbatim shape):**

```json
{
  "repo_id": "e8acc918-6627-4f5b-a411-80d4d121b47e",
  "pr_number": 19,
  "agent_id": "f1b2f6ed-5019-4772-b318-5593a9285e8c"
}
```

**From Cursor / Claude:** enable the `devdigest` server under Settings → MCP,
open a **new** chat (this agent session only sees MCP servers attached to it —
often `user-github` etc., not project `devdigest` until you reload + new chat),
then ask to run Security Reviewer on PR 19 or paste the JSON args above.

**From the CLI helper** (stdio MCP client — same server as `.mcp.json`; useful when
the IDE agent session has not attached project MCP yet):

```sh
cd devdigest-mcp
export DEVDIGEST_API_BASE="${DEVDIGEST_API_BASE:-http://localhost:3001}"

node scripts/call-mcp-tool.mjs run_agent_on_pr \
  '{"repo_id":"e8acc918-6627-4f5b-a411-80d4d121b47e","pr_number":19,"agent_id":"f1b2f6ed-5019-4772-b318-5593a9285e8c"}'
```

Blocks until the run finishes or **120s** timeout. On success you get a compact
verdict (`run_id`, `verdict`, `score`, `severity_counts`, capped `findings`).

### Read findings again later

```sh
node scripts/call-mcp-tool.mjs get_findings \
  '{"run_id":"<run_id-from-previous-response>"}'
```

Example run id from a completed Security pass on this PR:
`ad286630-bb1a-4500-a8d6-dcb15d81cf3a` (replace with yours).

### Sample verdict (illustrative)

```text
verdict: request_changes
score: 6
CRITICAL 2 · WARNING 2 · SUGGESTION 0

- CRITICAL  SQL injection in refund search query
            server/src/modules/refunds/repository.ts:10-12
- CRITICAL  Missing authentication on refund search endpoint
            server/src/modules/refunds/routes.ts:20-40
- WARNING   Inverted refund amount check in canIssueRefund
            server/src/modules/refunds/helpers.ts:5-8
- WARNING   Hardcoded financial parameters in client hook
            client/src/lib/hooks/refunds.ts:20-24
```

Needs a working LLM key in DevDigest Settings (or env) — otherwise the run
fails with a config / provider error.

---

## Tools

| Tool | Role |
|------|------|
| `list_agents` | List review agents (no `system_prompt`) |
| `run_agent_on_pr` | Start a review and **block** until done or **120s** timeout |
| `get_findings` | Compact verdict for a completed `run_id` |
| `get_conventions` | Repo conventions (default `accepted`) |
| `get_blast_radius` | Lab stub (`implemented: false`) |

## Environment

| Variable | Default |
|----------|---------|
| `DEVDIGEST_API_BASE` | `http://localhost:3001` |
| `DEVDIGEST_POLL_INTERVAL_MS` | `2000` |
| `DEVDIGEST_RUN_TIMEOUT_MS` | `120000` |

## Scripts

```sh
npm install
npm run typecheck
npm test                 # vitest, mocked fetch — no Docker / API
npm start                # stdio MCP (never console.log to stdout)
npm run dev              # tsx watch

# One-shot tool call (API must be up)
DEVDIGEST_API_BASE=http://localhost:3001 \
  node scripts/call-mcp-tool.mjs list_agents '{"enabled_only":true}'
```

## Architecture

Onion-inspired layering (dependency inward):

- **Delivery** — `src/tools/*`, `src/server.ts`
- **Application** — `src/services/*` (poll orchestration, projections)
- **Port** — `src/port/devdigest-api.ts`
- **Adapter** — `src/adapter/http-devdigest-client.ts` (+ local wire Zod)

Stdout is JSON-RPC only — log with `console.error`.

## Docs

- Planning / acceptance: [`specs/devdigest-mcp.md`](specs/devdigest-mcp.md)
- Token-budget practices: [`../docs/mcp/best-practices.md`](../docs/mcp/best-practices.md)
