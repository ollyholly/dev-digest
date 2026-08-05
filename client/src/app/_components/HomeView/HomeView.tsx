/* HomeView — loading/empty/CTA chrome for the "/" redirect landing spot.
   The actual redirect-once-repos-load effect stays in page.tsx. */
"use client";

import { EmptyState, Button, Skeleton } from "@devdigest/ui";
import { PageContainer } from "@/components/page-shell";
import type { Repo } from "@devdigest/shared";

export interface HomeViewProps {
  repos: Repo[] | undefined;
  isLoading: boolean;
  isError: boolean;
  onAddRepository: () => void;
  onOpenRepo: (repoId: string) => void;
}

export function HomeView({ repos, isLoading, isError, onAddRepository, onOpenRepo }: HomeViewProps) {
  return (
    <PageContainer title="Welcome to DevDigest" subtitle="Local-first AI PR review">
      {isLoading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 480 }}>
          <Skeleton height={20} width={240} />
          <Skeleton height={48} />
          <Skeleton height={48} />
        </div>
      ) : isError || !repos || repos.length === 0 ? (
        <EmptyState
          icon="GitBranch"
          title="No repositories yet"
          body="Add a repository to start reviewing pull requests. Set your API keys once in Settings → API Keys."
          cta="Add repository"
          onCta={onAddRepository}
        />
      ) : (
        <div>
          <p style={{ color: "var(--text-secondary)", marginBottom: 14 }}>Taking you to your repository…</p>
          <Button kind="primary" onClick={() => onOpenRepo(repos[0]!.id)}>
            Open {repos[0]!.full_name}
          </Button>
        </div>
      )}
    </PageContainer>
  );
}
