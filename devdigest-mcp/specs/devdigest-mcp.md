# Spec: `devdigest-mcp` (L04)

Planning contract for the local DevDigest MCP server. Implementation lives in
this package; practices in [`../../docs/mcp/best-practices.md`](../../docs/mcp/best-practices.md).

## Goal

Ship a **local-only** TypeScript MCP server over **stdio** that exposes five
DevDigest tools. Thin HTTP wrapper around `@devdigest/api`
(`http://localhost:3001`). `run_agent_on_pr` blocks until the review finishes
or **120 seconds** elapse. `get_blast_radius` is an honest lab stub.

## Out of scope

- Streamable HTTP / remote MCP
- Real blast-radius HTTP route
- Client UI / new Fastify routes / shared contract edits

## Canonical server metadata

- **name:** `devdigest`
- **version:** `0.1.0`
- **instructions:**

```text
Local DevDigest MCP server. Exposes review agents, PR reviews, repo conventions, and a blast-radius stub via a running DevDigest API on localhost:3001. Start the API with ./scripts/dev.sh before using write tools.
```

## Tools (verbatim descriptions)

1. `list_agents` — List configured DevDigest review agents.
2. `run_agent_on_pr` — Run one agent on a pull request and block until done or 120s timeout.
3. `get_findings` — Return a compact structured verdict for a completed review run.
4. `get_conventions` — Return repository conventions from the L02 conventions extractor.
5. `get_blast_radius` — Return blast radius for changed files. Lab stub — not implemented yet.

## HTTP mapping (real API)

| Tool | HTTP |
|------|------|
| `list_agents` | `GET /agents` |
| `run_agent_on_pr` | `POST /pulls/:prId/review` + poll `GET /pulls/:prId/runs` + `GET /pulls/:prId/reviews` |
| `get_findings` | resolve `run_id` → `pr_id`, then `GET /pulls/:prId/reviews` |
| `get_conventions` | `GET /repos/:repoId/conventions` (filter `candidates[].status` in MCP) |
| `get_blast_radius` | *(stub — no HTTP)* |

PR UUID is resolved via `GET /repos/:repoId/pulls` matching `pr_number`.

## Acceptance criteria

- [ ] Host lists exactly 5 tools with verbatim descriptions after a new chat
- [ ] `list_agents` returns agents without `system_prompt`
- [ ] `run_agent_on_pr` blocks until done or returns timeout at 120s with `run_id`
- [ ] `get_findings` returns compact verdict for a completed `run_id`
- [ ] `get_conventions` defaults to `accepted` only
- [ ] `get_blast_radius` returns stub with `implemented: false`
- [ ] No stdout logging; CI green on `devdigest-mcp.yml`
