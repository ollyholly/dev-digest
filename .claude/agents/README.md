# Claude Code / Cursor agents

Project subagents live here as Markdown + YAML frontmatter. Cursor also loads
this directory ([subagents docs](https://cursor.com/docs/subagents)). Full
prompts stay in each `*.md` file — this README is only a map.

**Model:** all agents use `model: inherit` (parent chat model).

```text
researcher  →  evidence reports
planner     →  Development Plan  →  (user approval)  →  implementer  →  code
                                                      ↘ optional: test-writer
                                                                ↓
                                         architecture-reviewer (readonly)
                                         plan-verifier (readonly checklist)
                                         doc-writer (docs + diagrams)
                                                                ↓
                                         security-review / pr-self-review (separate)
```

| Agent | File | Color | Responsibility |
|---|---|---|---|
| [researcher](researcher.md) | `researcher.md` | blue | Answer concrete repo or external questions with evidence |
| [planner](planner.md) | `planner.md` | purple | Produce a skill-aware Development Plan; never implement |
| [implementer](implementer.md) | `implementer.md` | green | Execute an approved plan; test touched packages; hand off review |
| [test-writer](test-writer.md) | `test-writer.md` | orange | Write UI/backend tests using project skills |
| [architecture-reviewer](architecture-reviewer.md) | `architecture-reviewer.md` | yellow | Read-only architecture boundary findings with evidence |
| [plan-verifier](plan-verifier.md) | `plan-verifier.md` | cyan | Checklist verification of code vs every plan/requirement item |
| [doc-writer](doc-writer.md) | `doc-writer.md` | magenta | Durable docs + diagrams into the correct `docs/` sections |

Product reviewer **system prompts** live under [`docs/agent-prompts/`](../../docs/agent-prompts/) — that is a different system from these Claude/Cursor agents.

---

## researcher

| | |
|---|---|
| **Responsibility** | Repo and/or external research; clarify vague asks first; no `/deep-research` |
| **Permissions** | `Read`, `Grep`, `Glob`, `Bash` (read-only), `WebSearch`, `WebFetch` — no Write/Edit |
| **Model** | `inherit` |
| **Inputs** | A concrete research question (and optional scope: repo vs external vs both) |
| **Outputs** | **Repo research** and/or **External research** report: Summary, Conclusions, Evidence, References, Not found |

---

## planner

| | |
|---|---|
| **Responsibility** | Structured Development Plan aligned with modules, `INSIGHTS.md`, and skills `implementer` will apply |
| **Permissions** | `Read`, `Grep`, `Glob`, `Bash` (read-only), `Skill`; `permissionMode: plan`; preload `engineering-insights` — no Write/Edit |
| **Model** | `inherit` |
| **Inputs** | Feature/fix goal; module `INSIGHTS.md` + package `CLAUDE.md` / root conventions; existing `specs/`; project skill map |
| **Outputs** | **Development Plan**: Goal, scope, modules, constraints, workstreams, file/layer plan, Skills for implementer table, test plan, risks, handoff |

### Rule sources (planner)

| Rule theme | Source |
|---|---|
| Subagent format, `tools`, `permissionMode: plan`, `skills` preload | [Claude Code subagents](https://code.claude.com/docs/en/sub-agents) |
| Skills as procedures; progressive load vs preload | [Claude Code skills](https://code.claude.com/docs/en/skills), [Agent Skills best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices) |
| Cursor loads `.claude/agents/`; `model: inherit` | [Cursor subagents](https://cursor.com/docs/subagents) |
| Path → skill routing for implementer table | [`.claude/skills/pr-self-review/references/skill-routing.md`](../skills/pr-self-review/references/skill-routing.md) |
| Read module `INSIGHTS.md` before planning | [`.claude/skills/engineering-insights`](../skills/engineering-insights/SKILL.md) |
| Onion / UI / secrets / migrations constraints | Package `CLAUDE.md`, root [`AGENTS.md`](../../AGENTS.md) |

---

## implementer

| | |
|---|---|
| **Responsibility** | Implement approved plan on frontend/backend; load named project skills; run package-scoped tests; implementation-only self-check |
| **Permissions** | `Read`, `Grep`, `Glob`, `Bash`, `Write`, `Edit`, `Skill` — no WebSearch/WebFetch; no PR open by default |
| **Model** | `inherit` |
| **Inputs** | Approved Development Plan (or equivalent); skill table or path buckets; module `INSIGHTS.md` / `CLAUDE.md` |
| **Outputs** | Code changes in scope; **Implementation Report**: Done, Skills applied, Tests run, Deviations, Self-check, Handoff, Not done |

### Rule sources (implementer)

| Rule theme | Source |
|---|---|
| Edit-capable subagent + Skill tool; narrow role / handoff | [Claude Code subagents](https://code.claude.com/docs/en/sub-agents) |
| Load skills on demand (no full preload) | [Skills overview](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview), [best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices) |
| `model: inherit` under Cursor | [Cursor subagents](https://cursor.com/docs/subagents) |
| Path → skill matrix (UI vs API vs shared contracts) | [skill-routing.md](../skills/pr-self-review/references/skill-routing.md) |
| INSIGHTS read/append loop | [engineering-insights](../skills/engineering-insights/SKILL.md) |
| Migrations, lockfiles, secrets, placement | Package `CLAUDE.md`, root [`AGENTS.md`](../../AGENTS.md) |
| Explicitly **not** owned: deep security / PR soft-gate | Deferred; see `security` and `pr-self-review` skills |

---

## test-writer

| | |
|---|---|
| **Responsibility** | Write/extend UI and backend tests; match Vitest/RTL and `TESTING.md` conventions |
| **Permissions** | `Read`, `Grep`, `Glob`, `Bash`, `Write`, `Edit`, `Skill` — no Web\* |
| **Model** | `inherit` |
| **Inputs** | Behavior/files under test; optional plan Test plan section |
| **Outputs** | Test files + **Test Writer Report** |

### Rule sources (test-writer)

| Rule theme | Source |
|---|---|
| Write-capable test agents (not readonly) | [Cursor subagents — test-runner](https://cursor.com/docs/subagents) |
| Tool allowlists / least privilege | [Claude Code subagents](https://code.claude.com/docs/en/sub-agents) |
| Client RTL skill | [react-testing-library](../skills/react-testing-library/SKILL.md) |
| Unit vs `*.it.test.ts`, package commands | [`TESTING.md`](../../TESTING.md), package `CLAUDE.md` |

---

## architecture-reviewer

| | |
|---|---|
| **Responsibility** | Read-only onion + frontend UI boundary review; findings with evidence |
| **Permissions** | `Read`, `Grep`, `Glob`, `Bash` (read-only), `Skill`; `readonly: true`; `permissionMode: plan`; preload `onion-architecture`, `frontend-ui-architecture` |
| **Model** | `inherit` |
| **Inputs** | Diff, paths, or post-implement scope |
| **Outputs** | **Architecture Review Report**: Findings, Passes, Out of scope, Not checked |

### Rule sources (architecture-reviewer)

| Rule theme | Source |
|---|---|
| Read-only reviewers; code-reviewer example | [Claude Code subagents](https://code.claude.com/docs/en/sub-agents) |
| Cursor `readonly: true` | [Cursor subagents](https://cursor.com/docs/subagents) |
| Boundary rules | [onion-architecture](../skills/onion-architecture/SKILL.md), [frontend-ui-architecture](../skills/frontend-ui-architecture/SKILL.md) |

---

## plan-verifier

| | |
|---|---|
| **Responsibility** | Per-requirement Met/Partial/Missing checklist vs plan/spec; no generic advice |
| **Permissions** | `Read`, `Grep`, `Glob`, `Bash` (tests OK, no mutate); `readonly: true`; `permissionMode: plan` |
| **Model** | `inherit` |
| **Inputs** | Approved plan/spec/AC + finished work (diff or Implementation Report) |
| **Outputs** | **Plan Verification Report**: Checklist table, failures, coverage, next agent |

### Rule sources (plan-verifier)

| Rule theme | Source |
|---|---|
| Verifier / orchestrator patterns | [Cursor subagents — common patterns](https://cursor.com/docs/subagents#common-patterns) |
| Gaps vs plan, not style | [Claude Code best practices](https://code.claude.com/docs/en/best-practices) |
| Spec acceptance checklists | Package `specs/_TEMPLATE.md` |

---

## doc-writer

| | |
|---|---|
| **Responsibility** | Durable feature docs + Mermaid into the correct `docs/` sections |
| **Permissions** | `Read`, `Grep`, `Glob`, `Bash`, `Write`, `Edit`, `Skill` (`mermaid-diagram`) |
| **Model** | `inherit` |
| **Inputs** | Plan / impl notes / code; confirmed doc target if ambiguous |
| **Outputs** | Doc paths + **Doc Writer Report** |

### Rule sources (doc-writer)

| Rule theme | Source |
|---|---|
| Skills/templates for structured output | [Claude Code skills](https://code.claude.com/docs/en/skills), [Agent Skills best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices) |
| Diagrams | [mermaid-diagram](../skills/mermaid-diagram/SKILL.md) |
| Placement | Package `*/docs/README.md`; root [`docs/`](../../docs/); not `docs/agent-prompts/` unless documenting product reviewer prompts |

---

## Not in this set

- **security-review** agent (use `security` skill / dedicated review later)
- **pr-self-review** remains a skill gate before GitHub PRs, not a subagent here
