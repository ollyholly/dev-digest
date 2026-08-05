# Preserve response schema compatibility

For every changed response or error Zod schema, compare every field's name,
type, required/optional state, nullability, container shape, and envelope.
Flag a response field that is removed or renamed, changes type, or moves from
required/non-null to optional/nullable. These changes silently break callers
that read the old field or trust its old type.

State the exact OLD and NEW field signatures and show the concrete caller
operation that fails, such as arithmetic on a number that is now a string or a
property read that now receives `undefined`.

## Bad

- Before: `{ id: number, displayName: string }`.
  After: `{ id: string, displayName?: string | null }`. Existing callers can
  perform numeric operations on the wrong type and can now dereference a
  missing name.
- Before: `{ data: User }`. After: `{ result: User }`. A caller reading
  `response.data` silently receives `undefined`.

## Good

- Keep `id: number` and `displayName: string`; add
  `canonicalId?: string` as an optional field.
- During a rename, return both `data` and `result` with identical values
  until the old field completes a documented deprecation window.

## What not to flag

Do NOT flag a newly added optional response field or a response guarantee that
becomes stronger for callers (optional → required, nullable → non-null) unless
the diff proves a legitimate server outcome can no longer serialize. Do not
flag formatting or implementation changes that produce the same wire shape.
