# Deprecate API contracts before removing them

Flag a route, request field, response field, enum value, or error code that is
silently deleted or renamed while existing callers can still use it. Require a
transition that keeps the old contract functional, marks it deprecated in the
public schema/docs, points callers to the replacement, and gives a removal
version or date. A documentation-only warning is not a compatibility path if
the old contract disappears in the same diff.

## Bad

- Delete `GET /users/:id` and add `GET /accounts/:id` in the same release
  with no alias or deprecation period.
- Rename response field `displayName` to `name` and immediately stop
  returning `displayName`.

## Good

- Keep `GET /users/:id` working, mark it deprecated, advertise
  `GET /accounts/:id`, emit the project's standard deprecation/sunset
  metadata, and remove the old route only at the announced major boundary.
- Return both `displayName` and `name` during migration, document
  `displayName` as deprecated, then remove it in the next major version.

## What not to flag

Do NOT flag a new alias or replacement that leaves the old contract intact.
Do not flag removal after the documented deprecation window when the release
uses the promised major/versioned boundary and supported callers have a
migration path. Do not require deprecation for an unreleased internal contract
with no consumers.
