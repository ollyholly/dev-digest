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

For every changed route and request/error contract, reconstruct the BEFORE and
AFTER signature. Flag:

- A removed or renamed route path, HTTP method, request field, status code, or
  error-envelope field.
- A previously optional request field made required.
- A request field's accepted type narrowed (for example, \`z.string()\` →
  \`z.enum(["open", "closed"])\`) so a previously valid payload is rejected.
- The same logical outcome moving to a different success or error status.

State the OLD and NEW signatures and identify whether the caller fails LOUDLY
(validation or HTTP error) or SILENTLY (missing or misinterpreted data). Apply
the response-schema directive to response field types, requiredness, and
nullability, and report each contract break only once.

## Bad

- Before: \`POST /users\` accepts \`{ nickname?: string }\`.
  After: the same route requires \`{ nickname: string }\`. Existing requests
  that omit \`nickname\` now fail validation.
- Before: \`DELETE /tokens/:id\` returns \`204\`.
  After: it returns \`200 { ok: true }\` for the same success case. Callers that
  branch on \`204\` no longer recognize success.

## Good

- Keep \`nickname\` optional and apply a server-side default; introduce a
  required replacement only in a new versioned contract.
- Add \`POST /users/bulk\` without changing the existing \`POST /users\`
  signature.

## What not to flag

Do NOT flag a new route, a new optional request field, a widened accepted input
type, or an implementation-only refactor that leaves path, method, payload,
status, and error behavior unchanged. Do not flag pre-existing contract gaps
outside the changed diff.`;

export const API_RESPONSE_SCHEMA_SKILL = `# Preserve response schema compatibility

For every changed response or error Zod schema, compare every field's name,
type, required/optional state, nullability, container shape, and envelope.
Flag a response field that is removed or renamed, changes type, or moves from
required/non-null to optional/nullable. These changes silently break callers
that read the old field or trust its old type.

State the exact OLD and NEW field signatures and show the concrete caller
operation that fails, such as arithmetic on a number that is now a string or a
property read that now receives \`undefined\`.

## Bad

- Before: \`{ id: number, displayName: string }\`.
  After: \`{ id: string, displayName?: string | null }\`. Existing callers can
  perform numeric operations on the wrong type and can now dereference a
  missing name.
- Before: \`{ data: User }\`. After: \`{ result: User }\`. A caller reading
  \`response.data\` silently receives \`undefined\`.

## Good

- Keep \`id: number\` and \`displayName: string\`; add
  \`canonicalId?: string\` as an optional field.
- During a rename, return both \`data\` and \`result\` with identical values
  until the old field completes a documented deprecation window.

## What not to flag

Do NOT flag a newly added optional response field or a response guarantee that
becomes stronger for callers (optional → required, nullable → non-null) unless
the diff proves a legitimate server outcome can no longer serialize. Do not
flag formatting or implementation changes that produce the same wire shape.`;

export const API_SEMVER_DISCIPLINE_SKILL = `# Require major-version discipline for breaking APIs

When this diff changes a released or externally consumed API, classify the
wire-level change before checking the proposed release/versioning strategy.
Flag a removed route or field, newly required request input, narrowed accepted
input, incompatible response shape, or changed status semantics that ships in
a patch/minor release or in an unversioned replacement with no compatibility
path. Such changes require a major version boundary or a parallel versioned
contract that preserves existing callers.

If the API has no explicit version number, do not invent one. State that the
breaking change cannot safely replace the current contract in place and
recommend a versioned route/schema or backward-compatible migration.

## Bad

- \`1.8.2 → 1.9.0\` removes \`GET /users/:id\` or changes
  \`user.id: number\` to \`string\`.
- An unversioned \`/users\` response deletes \`displayName\` at deploy time,
  leaving every current caller to migrate simultaneously.

## Good

- Release the incompatible contract as \`2.0.0\` with migration notes.
- Add \`/v2/users\`, keep \`/v1/users\` working through its support window, and
  migrate callers before retiring v1.

## What not to flag

Do NOT require a major bump for additive optional fields, new endpoints,
widened accepted inputs, or internal refactors with identical observable wire
behavior. Do not flag an unreleased/private contract when the diff proves it
has no existing consumers.`;

export const API_DEPRECATION_POLICY_SKILL = `# Deprecate API contracts before removing them

Flag a route, request field, response field, enum value, or error code that is
silently deleted or renamed while existing callers can still use it. Require a
transition that keeps the old contract functional, marks it deprecated in the
public schema/docs, points callers to the replacement, and gives a removal
version or date. A documentation-only warning is not a compatibility path if
the old contract disappears in the same diff.

## Bad

- Delete \`GET /users/:id\` and add \`GET /accounts/:id\` in the same release
  with no alias or deprecation period.
- Rename response field \`displayName\` to \`name\` and immediately stop
  returning \`displayName\`.

## Good

- Keep \`GET /users/:id\` working, mark it deprecated, advertise
  \`GET /accounts/:id\`, emit the project's standard deprecation/sunset
  metadata, and remove the old route only at the announced major boundary.
- Return both \`displayName\` and \`name\` during migration, document
  \`displayName\` as deprecated, then remove it in the next major version.

## What not to flag

Do NOT flag a new alias or replacement that leaves the old contract intact.
Do not flag removal after the documented deprecation window when the release
uses the promised major/versioned boundary and supported callers have a
migration path. Do not require deprecation for an unreleased internal contract
with no consumers.`;
