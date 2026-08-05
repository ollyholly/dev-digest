/**
 * Built-in skill bodies used by the seed (Test Quality Reviewer + API Contract
 * Reviewer). Each body is written as a DIRECTIVE instruction to the reviewing
 * agent (per the Skills editor's "description is the skill's interface" rule),
 * not a description of the skill. The DB row is the source of truth at run
 * time; editing a prompt here only affects freshly seeded workspaces.
 */

export const UNCOVERED_BRANCHES_SKILL = `# Flag uncovered branches

For every conditional, switch case, early return, or catch block introduced or
changed by this diff, verify a test in the diff drives execution down that
specific path. If a branch has zero matching test assertions, flag it —
name the exact branch (file:line) and state which input would need to reach it.

Do not flag branches that were already untested before this diff and are not
touched by it. Do not flag trivial branches (a type guard with no behavioural
difference between arms).`;

export const MISSING_CORNER_CASES_SKILL = `# Flag missing corner cases

Enumerate the boundary inputs the CHANGED production code itself handles:
empty/null/undefined, zero, negative, max-length, duplicate entries, and
concurrent access. For each one the code explicitly handles (a guard, a
validation rule, a special-cased branch), check whether a test in this diff
actually exercises that input.

If the diff's new tests cover only the happy path implied by the PR title or
description, and a boundary case the code handles goes untested, flag it by
name (e.g. "empty array input to X is handled at line N but never tested").

Do not require a test for a boundary the code does not itself special-case —
only flag gaps where the code clearly branches on that input.`;

export const OVER_MOCKING_SKILL = `# Flag over-mocking

Flag a test that mocks the exact unit it claims to test — for example,
stubbing out the function under test itself, or replacing all of a service's
internal logic with mocks so the assertion only verifies a mock was called
rather than that real behaviour occurred.

Flag an integration-style test (file matches \`*.it.test.ts\` or is under a
directory clearly intended for integration coverage) that mocks the database
or external adapter it is supposed to be integrating with — this defeats the
purpose of that test tier and should run against the real dependency (or a
realistic fixture/testcontainer) instead.

Do not flag legitimate unit-test mocking of a collaborator OUTSIDE the unit
under test (e.g. mocking a GitHub client so a service's own logic can be
tested in isolation) — that is correct unit-test practice, not over-mocking.`;

export const FLAKY_TEST_SMELLS_SKILL = `# Flag flaky-test smells

Flag a new or changed test that relies on:
- Real wall-clock time (\`Date.now()\`, \`new Date()\`, \`setTimeout\`) without a
  fake-clock/deterministic seam — a slow CI runner can flip the assertion.
- Unseeded randomness feeding an assertion (a random ID, a shuffled array)
  with no fixed seed or mock.
- Shared mutable state between tests (a module-level variable, a DB row
  reused across \`it\` blocks without reset) that makes pass/fail depend on
  execution order.
- A missing \`await\` on an async assertion, or a race between an emitted
  event/callback and the assertion that reads its result.

For each, cite the exact line and name the specific mechanism that would make
the test intermittently fail — not a generic "this could be flaky."`;

export const API_CONTRACT_BREAKING_CHANGE_SKILL = `# Flag API contract breaking changes

For every route handler or Zod request/response schema touched by this diff,
reconstruct the BEFORE and AFTER shape and check for:

- A removed or renamed route path/method, request field, or response field.
- A previously optional request field made required.
- A request field's accepted type narrowed (e.g. \`z.string()\` → \`z.enum([...])\`)
  so a previously-valid payload would now fail validation.
- A response field's type changed, or its nullability flipped, in a way an
  existing caller's parsing would not expect.
- A changed success/error status code for the same logical outcome.

For every flagged change, state the OLD signature and the NEW signature
explicitly, and say whether an existing caller fails LOUDLY (a validation
error) or SILENTLY (wrong/missing data with no error) — silent breakage is
the more severe case and should be called out as such.

Do NOT flag purely additive changes: a new optional field, a new route, or a
widened accepted type never breaks an existing caller.`;
