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
 * Linked issue number from PR body — same regex family as Octokit adapter
 * (`closes|fixes|resolves #N` / bare `#N`).
 */
export function extractLinkedIssueNumber(body: string): number | undefined {
  const m = body.match(/(?:closes|fixes|resolves)?\s*#(\d+)/i);
  if (!m?.[1]) return undefined;
  return Number(m[1]);
}
