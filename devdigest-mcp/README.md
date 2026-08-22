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

Against seeded demo data (after `./scripts/dev.sh` with seed):

1. `list_agents` — expect General / Security (and any custom agents).
2. `run_agent_on_pr` — `repo_id` (UUID from the UI or `GET /repos`),
   `pr_number` **482**, `agent_id` from step 1. Blocks until done or **120s**.
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
