/* /skills/:id — Skill Editor (5 tabs: Config/Preview/Evals/Stats/Versions).
   Fetches the skill + skill list and delegates sidebar/editor chrome to
   SkillEditorView. Mirrors /agents/[id]/page.tsx. */
"use client";

import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { ErrorState } from "@devdigest/ui";
import { AppShell } from "@/components/app-shell";
import { useSkills, useSkill, useUpdateSkill } from "@/lib/hooks/skills";
import { ApiError } from "@/lib/api";
import { SkillEditorView } from "./_components/SkillEditorView";

export default function SkillEditorPage() {
  const params = useParams<{ id: string }>();
  const { id } = params;
  const t = useTranslations("skills");

  const { data: skills } = useSkills();
  const { data: skill, isLoading, isError, error, refetch } = useSkill(id);
  const update = useUpdateSkill();

  const crumb = [
    { label: t("page.crumbLab") },
    { label: t("page.crumbSkills"), href: "/skills" },
    { label: skill?.name ?? t("detail.crumbSkill") },
  ];

  if (isError || (!isLoading && !skill)) {
    return (
      <AppShell crumb={crumb}>
        <ErrorState
          fullScreen
          title={t("detail.notFound.title")}
          body={error instanceof ApiError ? error.message : t("detail.notFound.body")}
          onRetry={() => refetch()}
        />
      </AppShell>
    );
  }

  return (
    <AppShell crumb={crumb}>
      <SkillEditorView
        id={id}
        skills={skills}
        skill={skill}
        isLoading={isLoading}
        onToggleSkill={(skillId, enabled) => update.mutate({ id: skillId, patch: { enabled } })}
      />
    </AppShell>
  );
}
