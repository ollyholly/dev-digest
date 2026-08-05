/** Kebab-case a skill name for the mini code-editor's filename header, e.g.
 *  "PR Quality Rubric" -> "pr-quality-rubric". Best-effort — not a full slugify. */
export function toKebabCase(name: string): string {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "skill"
  );
}

/** Rough client-side token estimate (~4 chars/token). Not a real tokenizer —
 *  just enough to give a ballpark before saving. */
export function estimateTokens(body: string): number {
  return Math.ceil(body.length / 4);
}
