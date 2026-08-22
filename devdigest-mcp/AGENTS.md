# `@devdigest/mcp` — local MCP server (L04)

stdio MCP wrapper around `@devdigest/api` on `:3001`. Five tools; blocking
review poll (120s); blast-radius stub. Full detail: [`README.md`](README.md) ·
[`../docs/mcp/best-practices.md`](../docs/mcp/best-practices.md) ·
[`../TESTING.md`](../TESTING.md).

## Stack

`@modelcontextprotocol/sdk` (stdio) + `zod` + `tsx` / Vitest. Own
`package-lock.json` (npm), same pattern as `e2e/` / `reviewer-core/`.

## Build / run / test

```sh
npm install
npm test          # hermetic unit tests (mocked fetch)
npm run typecheck
npm start         # stdio — requires API on :3001 for write tools
```

## Structure

```
src/
  index.ts / server.ts / config.ts
  port/devdigest-api.ts
  adapter/http-devdigest-client.ts + wire-schemas.ts
  services/  tools/  projections/
```

**Knowledge:** [`specs/`](specs/README.md) when planning MCP tool changes.

## Non-default conventions

- **Never write to stdout** — JSON-RPC channel; use `console.error`.
- Tool handlers call **one service** each; services depend on
  `DevDigestApiPort`, not `fetch`.
- `run_agent_on_pr` polls `GET /pulls/:id/runs` every 2s for up to 120s.
- Wire Zod schemas are **local** (not `@devdigest/shared`) to keep the package
  free of shared `.default()` input/output skew under Zod 3.25.

## Do-not-touch / gotchas

- No Fastify / `server/src` changes for v1 — MCP is HTTP client only.
- **`package-lock.json`** — never hand-edit; only via `npm install`.
- Hosts snapshot tools at session start — new chat after tool renames.
