/* /skills — Skills list. SkillCards + "Add Skill" import dropdown/drawer.
   Selecting a skill navigates to the 5-tab editor at /skills/:id. */
"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button, Dropdown, EmptyState, ErrorState, Skeleton, Icon } from "@devdigest/ui";
import { AppShell } from "../../../../components/app-shell";
import { useSkills, useUpdateSkill } from "../../../../lib/hooks/skills";
import { SkillCard } from "../SkillCard";
import { AddSkillDrawer } from "./_components/AddSkillDrawer";
import type { ImportTab } from "./_components/AddSkillDrawer/constants";
import { filterSkills } from "./helpers";
import { s } from "./styles";

export function SkillsListView() {
  const t = useTranslations("skills");
  const router = useRouter();
  const { data: skills, isLoading, isError, refetch } = useSkills();
  const update = useUpdateSkill();
  const [drawerTab, setDrawerTab] = React.useState<ImportTab | null>(null);
  const [search, setSearch] = React.useState("");

  const list = filterSkills(skills ?? [], search);

  return (
    <AppShell crumb={[{ label: t("page.crumbLab") }, { label: t("page.crumbSkills") }]}>
      {drawerTab && (
        <AddSkillDrawer
          initialTab={drawerTab}
          onClose={() => setDrawerTab(null)}
          onImported={(skill) => {
            setDrawerTab(null);
            router.push(`/skills/${skill.id}?tab=config`);
          }}
        />
      )}
      <div style={s.page}>
        <div style={s.header}>
          <div style={s.headerText}>
            <h1 style={s.h1}>{t("page.heading")}</h1>
          </div>
          <div style={s.search}>
            <Icon.Search size={13} style={s.searchIcon} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("page.searchPlaceholder")}
              aria-label={t("page.searchPlaceholder")}
              style={s.searchInput}
            />
          </div>
          <Dropdown
            width={220}
            align="right"
            trigger={
              <Button kind="primary" size="sm" icon="Plus" iconRight="ChevronDown">
                {t("page.addSkill")}
              </Button>
            }
            items={[
              { label: t("page.menu.fromFile"), icon: "Upload", onClick: () => setDrawerTab("file") },
              { label: t("page.menu.fromUrl"), icon: "Globe", onClick: () => setDrawerTab("url") },
              { label: t("page.menu.community"), icon: "Search", onClick: () => setDrawerTab("community") },
            ]}
          />
        </div>

        {isLoading && (
          <div style={s.grid}>
            <Skeleton height={140} />
            <Skeleton height={140} />
            <Skeleton height={140} />
          </div>
        )}
        {isError && <ErrorState body={t("page.loadError")} onRetry={() => refetch()} />}
        {!isLoading && !isError && list.length === 0 && (
          <EmptyState
            icon="Sparkles"
            title={t("page.empty.title")}
            body={t("page.empty.body")}
            cta={t("page.empty.cta")}
            onCta={() => setDrawerTab("file")}
          />
        )}
        {list.length > 0 && (
          <div style={s.grid}>
            {list.map((skill) => (
              <SkillCard
                key={skill.id}
                skill={skill}
                onClick={() => router.push(`/skills/${skill.id}?tab=config`)}
                onToggle={(enabled) => update.mutate({ id: skill.id, patch: { enabled } })}
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
