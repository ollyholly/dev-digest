# Finding format and severity

## Report template

```markdown
## PR Self Review — BLOCK | PASS

Skills run: …
Files reviewed: …
Budget: full | triaged (skipped: …)
Preflight: pass | fail (…)

| Severity | ID | Skill | Location | Finding | Fix hint |
|---|---|---|---|---|---|
| critical | ui-arch-colocation-1 | frontend-ui-architecture | client/...:42 | … | … |

Critical: N · High: N · Medium: N · Low: N
```

Sort rows by severity (critical first). Location as `path:line` when known.

Verdict:

- **BLOCK** if Critical ≥ 1
- **PASS** otherwise (high/medium/low still listed)

## Finding IDs

Use stable kebab ids: `<skill-short>-<topic>-<n>`.

Examples:

- `ui-arch-colocation-1`
- `react-bp-pure-render-2`
- `fastify-auth-barrier-1`
- `security-a01-idor-1`
- `zod-safeparse-1`
- `preflight-client-typecheck-1`
- `gotcha-migration-edit-1`

## Severity mapping

Map source-skill labels onto: `critical` | `high` | `medium` | `low`.

| Source signal | Mapped severity |
|---|---|
| `CRITICAL`, “must fix”, OWASP high-confidence vuln, preflight fail from diff, confirmed gotcha | `critical` |
| `HIGH`, likely bug or scaling risk without confirmed exploit | `high` |
| `MEDIUM`, maintainability / DX | `medium` |
| Style nit, optional suggestion | `low` |

Only **critical** soft-blocks PR creation.

## Calibration — is critical

- Confirmed security issue with attacker-controlled input (`security` high confidence)
- Preflight typecheck/test failure caused by the diff
- Shared-contract change that breaks `client/` or `reviewer-core/` consumers
- Editing committed migration SQL under `server/src/db/migrations/**`
- Secrets or API keys in the diff
- Secrets via `process.env` / `AppConfig` in feature code (must use `LocalSecretsProvider`)

## Calibration — is not critical

- Style, naming, or “prefer X” maintainability notes
- Empty future-lesson DB tables that look unused (intentional course schema)
- Suggestions outside changed hunks with no clear bug
- Course-template patterns documented as intentional in AGENTS/CLAUDE docs
- Theoretical security notes without confirmed attacker-controlled input

## Fix hints

One short imperative line per finding (e.g. “Move fetch into `lib/hooks` and
keep the page thin”). Do not auto-fix unless the user asks.
