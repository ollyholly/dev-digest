# MCP (L04) — docs

Reference for the `devdigest-mcp` server (course lesson L04). Not a
planning spec — acceptance criteria live in
[`../../devdigest-mcp/specs/devdigest-mcp.md`](../../devdigest-mcp/specs/devdigest-mcp.md).

| File | What it is |
|---|---|
| [`best-practices.md`](best-practices.md) | How to build a local MCP server that stays cheap in a new chat, plus tool/transport conventions |
| [`../../devdigest-mcp/README.md`](../../devdigest-mcp/README.md) | **From-zero setup** + **worked example** (Security Reviewer on PR #19), CLI helper, `.mcp.json` |

**Lifecycle:** `./scripts/dev.sh` starts Postgres + API + web only. Start MCP
separately when a host needs it — see the package README “From zero” section.

### GitHub MCP (Cursor)

Official remote server (`https://api.githubcopilot.com/mcp/`), not the deprecated
npm `@modelcontextprotocol/server-github` package.

| Scope | File | Secrets |
|---|---|---|
| **Personal (working)** | `~/.cursor/mcp.json` | PAT stored locally (mode `0600`) — set via Cursor MCP UI or `gh auth token` |
| **Project template** | [`.cursor/mcp.json`](../../.cursor/mcp.json) | Uses `${env:GITHUB_PERSONAL_ACCESS_TOKEN}` — export that env var before starting Cursor |

After editing MCP config: **reload MCP** in Cursor Settings → MCP (or restart Cursor), then **open a new chat**. Confirm a green status on `github`.

Create a fine-grained or classic PAT with at least `repo` (and `read:org` if you need org repos): [GitHub tokens](https://github.com/settings/tokens).

Product context: [`../ONBOARDING.md`](../ONBOARDING.md) · course map in
[`../../README.md`](../../README.md) (L04: `devdigest-mcp` · Blast Radius).
