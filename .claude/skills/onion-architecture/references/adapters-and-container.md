# Adapters and the Container

External systems sit on the **outer ring**. Application code depends on **port
interfaces** from `@devdigest/shared` (`vendor/shared/adapters.ts`). Concrete
classes live under `server/src/adapters/` and are constructed in the composition
root.

## Port → adapter map (DevDigest)

| Port (shared) | Typical adapter | Path |
|---|---|---|
| `SecretsProvider` | `LocalSecretsProvider` | `adapters/secrets/local.ts` |
| `AuthProvider` | `LocalNoAuthProvider` | `adapters/auth/local.ts` |
| `GitClient` | `SimpleGitClient` | `adapters/git/simple-git.ts` |
| `GitHubClient` | `OctokitGitHubClient` | `adapters/github/octokit.ts` |
| `CodeIndex` | `RipgrepCodeIndex` | `adapters/codeindex/ripgrep.ts` |
| `LLMProvider` | OpenAI / Anthropic / OpenRouter | `adapters/llm/*`, reviewer-core |
| `Embedder` | `OpenAIEmbedder` | `adapters/embedder/openai.ts` |
| Dep graph / tokenizer | `DepCruiseGraph`, `TiktokenTokenizer` | `adapters/depgraph`, `adapters/tokenizer` |

Test doubles: `adapters/mocks.ts`, injected via `ContainerOverrides`.

## Composition root

[`server/src/platform/container.ts`](../../../../server/src/platform/container.ts):

- One `Container` per app instance (`app.container`).
- Lazily builds adapters; reads secrets through `SecretsProvider` (never put
  API keys in `AppConfig` — see `server/AGENTS.md`).
- Exposes shared repos (`agentsRepo`, `reviewRepo`) so modules do not reach
  into each other’s folders.
- Accepts `ContainerOverrides` so unit tests never hit the network or real keys.

**Adapters are constructed only here** (or in mocks/tests). Services must not
`new SimpleGitClient(...)` or `import` adapter concrete classes for production
wiring.

## Rules for application code

1. **Services** take `Container` (or narrower ports) and call `container.git`,
   `container.secrets`, `container.llm()`, etc. — those getters return **port
   types**, even though implementations are adapters.
2. **Routes** may read `req.server.container` only to construct/obtain a
   **service**, not to call adapter methods for business work.
3. Prefer depending on the interface type from `@devdigest/shared`, not the
   class from `adapters/`.
4. Prefer extending an existing port over leaking a new SDK into a service.
5. Repo-intel pipelines that need `depgraph` / `tokenizer` should still go
   through Container-provided ports, not ad-hoc `adapters/*` imports from
   routes.

## Secrets

- Path: `~/.devdigest/secrets.json` (mode `0600`) via `LocalSecretsProvider`.
- `process.env` is fallback only.
- Never thread secrets through route handlers into random helpers — resolve
  inside adapters / Container-backed services.
