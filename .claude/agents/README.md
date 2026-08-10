# Claude Code / Cursor agents

Project subagents live here as Markdown + YAML frontmatter. Cursor also loads
this directory ([subagents docs](https://cursor.com/docs/subagents)). Full
prompts stay in each `*.md` file — this README is only a map.

**Model:** all agents use `model: inherit` (parent chat model).

```text
researcher  →  evidence reports
planner     →  Development Plan  →  (user approval)  →  implementer  →  code + Implementation Report
                                                                         ↓
                                              architecture / security review (separate agents, not here yet)
```

| Agent | File | Color | Responsibility |
|---|---|---|---|
| [researcher](researcher.md) | `researcher.md` | blue | Answer concrete repo or external questions with evidence |
| [planner](planner.md) | `planner.md` | purple | Produce a skill-aware Development Plan; never implement |
| [implementer](implementer.md) | `implementer.md` | green | Execute an approved plan; test touched packages; hand off review |

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
| Explicitly **not** owned: deep security / PR soft-gate | Deferred to separate review agents; see `security` and `pr-self-review` skills |

---

## Not in this set

Architecture-review and security-review agents are intentional handoff targets, not defined here yet.
