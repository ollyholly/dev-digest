# Require major-version discipline for breaking APIs

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

- `1.8.2 → 1.9.0` removes `GET /users/:id` or changes
  `user.id: number` to `string`.
- An unversioned `/users` response deletes `displayName` at deploy time,
  leaving every current caller to migrate simultaneously.

## Good

- Release the incompatible contract as `2.0.0` with migration notes.
- Add `/v2/users`, keep `/v1/users` working through its support window, and
  migrate callers before retiring v1.

## What not to flag

Do NOT require a major bump for additive optional fields, new endpoints,
widened accepted inputs, or internal refactors with identical observable wire
behavior. Do not flag an unreleased/private contract when the diff proves it
has no existing consumers.
