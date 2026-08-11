/** Cap of file paths passed into the intent LLM / fingerprint. */
export const MAX_INTENT_PATHS = 80;
/** Cap of commit subject lines. */
export const MAX_INTENT_COMMITS = 30;

/** First line of a commit message (subject). */
export function commitSubject(message: string): string {
  const line = message.split(/\r?\n/, 1)[0] ?? message;
  return line.trim();
}

export function gatherFilePaths(paths: string[]): string[] {
  return [...new Set(paths.map((p) => p.trim()).filter(Boolean))].slice(0, MAX_INTENT_PATHS);
}

export function gatherCommitSubjects(messages: string[]): string[] {
  return messages
    .map(commitSubject)
    .filter(Boolean)
    .slice(0, MAX_INTENT_COMMITS);
}

/**
 * Linked issue number from PR body — require an explicit link keyword so prose
 * like “seeded PR #482” does not become a false linked_issue signal.
 */
export function extractLinkedIssueNumber(body: string): number | undefined {
  const m = body.match(/(?:closes|fixes|resolves)\s*:?\s*#(\d+)/i);
  if (!m?.[1]) return undefined;
  return Number(m[1]);
}
