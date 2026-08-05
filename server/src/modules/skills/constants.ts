/** Constants for the skills module. */

/** Initial version recorded for a newly-created skill. */
export const INITIAL_SKILL_VERSION = 1;

/** Default skill description when none is supplied on insert. */
export const DEFAULT_SKILL_DESCRIPTION = '';

/** Max bytes fetched for a URL-imported skill body — a runaway host can't blow memory/DB. */
export const MAX_IMPORTED_BODY_BYTES = 200_000;
