/* Root — sends the user to the first repo's PR list, or onboarding if no repos. */
"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useRepos } from "@/lib/hooks";
import { AppShell } from "@/components/app-shell";
import { HomeView } from "./_components/HomeView";

export default function HomePage() {
  const router = useRouter();
  const { data: repos, isLoading, isError } = useRepos();

  React.useEffect(() => {
    if (repos && repos.length > 0) {
      router.replace(`/repos/${repos[0]!.id}/pulls`);
    }
  }, [repos, router]);

  return (
    <AppShell crumb={[{ label: "DevDigest" }]}>
      <HomeView
        repos={repos}
        isLoading={isLoading}
        isError={isError}
        onAddRepository={() => router.push("/onboarding")}
        onOpenRepo={(repoId) => router.push(`/repos/${repoId}/pulls`)}
      />
    </AppShell>
  );
}
