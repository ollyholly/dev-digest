"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Button, TextInput, EmptyState, ErrorState, Skeleton } from "@devdigest/ui";
import type { Skill } from "@devdigest/shared";
import { useCommunitySkills, useImportSkillFromCommunity } from "../../../../../../lib/hooks/skills";
import { ApiError } from "../../../../../../lib/api";
import { s } from "./styles";

/** Search + import from the fixed community catalog. Import always creates
 *  the skill disabled — same untrusted-by-default rule as URL import. */
export function CommunityImportTab({ onImported }: { onImported: (skill: Skill) => void }) {
  const t = useTranslations("skills");
  const [query, setQuery] = React.useState("");
  const { data: results, isLoading, isError, refetch } = useCommunitySkills(query);
  const importCommunity = useImportSkillFromCommunity();
  const [error, setError] = React.useState<string | null>(null);
  const [importingRepo, setImportingRepo] = React.useState<string | null>(null);

  const importOne = async (repo: string) => {
    setError(null);
    setImportingRepo(repo);
    try {
      const skill = await importCommunity.mutateAsync({ repo });
      onImported(skill);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("drawer.importFailed"));
    } finally {
      setImportingRepo(null);
    }
  };

  return (
    <div>
      {error && <div style={s.errorNote}>{error}</div>}
      <TextInput value={query} onChange={setQuery} placeholder={t("community.searchPlaceholder")} />
      {isLoading && (
        <div style={s.communityList}>
          <Skeleton height={56} />
          <Skeleton height={56} />
        </div>
      )}
      {isError && <ErrorState body={t("community.loadError")} onRetry={() => refetch()} />}
      {!isLoading && !isError && (results?.length ?? 0) === 0 && (
        <EmptyState icon="Search" title={t("community.noMatch.title")} body={t("community.noMatch.body")} />
      )}
      {!isLoading && !isError && (results?.length ?? 0) > 0 && (
        <div style={s.communityList}>
          {results!.map((r) => (
            <div key={r.repo} style={s.communityRow}>
              <div style={s.communityMeta}>
                <div className="mono" style={s.communityName}>
                  {r.name}
                </div>
                <div style={s.communityDesc}>{r.desc}</div>
              </div>
              <Button
                kind="secondary"
                size="sm"
                icon="Upload"
                onClick={() => importOne(r.repo)}
                disabled={importingRepo === r.repo}
              >
                {importingRepo === r.repo ? t("community.importing") : t("community.import")}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
