"use client";

import React from "react";

/**
 * The PR's owner/repo + head sha, needed only to deep-link a finding's
 * file:line to GitHub. Provided once at the top of the PR detail tree
 * (PrDetailView) instead of threaded as a prop through FindingsTab →
 * ReviewRunAccordion → FindingsPanel, none of which read the values
 * themselves — only the leaf FindingCard does.
 */
export interface GithubLinkInfo {
  repoFullName: string | null;
  headSha: string | null;
}

const GithubLinkContext = React.createContext<GithubLinkInfo>({
  repoFullName: null,
  headSha: null,
});

export function GithubLinkProvider({
  repoFullName,
  headSha,
  children,
}: GithubLinkInfo & { children: React.ReactNode }) {
  const value = React.useMemo(() => ({ repoFullName, headSha }), [repoFullName, headSha]);
  return <GithubLinkContext.Provider value={value}>{children}</GithubLinkContext.Provider>;
}

export function useGithubLink(): GithubLinkInfo {
  return React.useContext(GithubLinkContext);
}
