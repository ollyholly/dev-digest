# Flag API contract breaking changes

For every changed route and request/error contract, reconstruct the BEFORE and
AFTER signature. Flag:

- A removed or renamed route path, HTTP method, request field, status code, or
  error-envelope field.
- A previously optional request field made required.
- A request field's accepted type narrowed (for example, `z.string()` →
  `z.enum(["open", "closed"])`) so a previously valid payload is rejected.
- The same logical outcome moving to a different success or error status.

State the OLD and NEW signatures and identify whether the caller fails LOUDLY
(validation or HTTP error) or SILENTLY (missing or misinterpreted data). Apply
the response-schema directive to response field types, requiredness, and
nullability, and report each contract break only once.

## Bad

- Before: `POST /users` accepts `{ nickname?: string }`.
  After: the same route requires `{ nickname: string }`. Existing requests
  that omit `nickname` now fail validation.
- Before: `DELETE /tokens/:id` returns `204`.
  After: it returns `200 { ok: true }` for the same success case. Callers that
  branch on `204` no longer recognize success.

## Good

- Keep `nickname` optional and apply a server-side default; introduce a
  required replacement only in a new versioned contract.
- Add `POST /users/bulk` without changing the existing `POST /users`
  signature.

## What not to flag

Do NOT flag a new route, a new optional request field, a widened accepted input
type, or an implementation-only refactor that leaves path, method, payload,
status, and error behavior unchanged. Do not flag pre-existing contract gaps
outside the changed diff.
