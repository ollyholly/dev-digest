# MCP (L04) — docs

Reference for the `devdigest-mcp` server (course lesson L04). Not a
planning spec — acceptance criteria live in
[`../../devdigest-mcp/specs/devdigest-mcp.md`](../../devdigest-mcp/specs/devdigest-mcp.md).

| File | What it is |
|---|---|
| [`best-practices.md`](best-practices.md) | How to build a local MCP server that stays cheap in a new chat, plus tool/transport conventions |
| [`../../devdigest-mcp/README.md`](../../devdigest-mcp/README.md) | **From-zero setup** (opt-in; not started by `./scripts/dev.sh`), `.mcp.json`, Inspector, smoke |

**Lifecycle:** `./scripts/dev.sh` starts Postgres + API + web only. Start MCP
separately when a host needs it — see the package README “From zero” section.

Product context: [`../ONBOARDING.md`](../ONBOARDING.md) · course map in
[`../../README.md`](../../README.md) (L04: `devdigest-mcp` · Blast Radius).
