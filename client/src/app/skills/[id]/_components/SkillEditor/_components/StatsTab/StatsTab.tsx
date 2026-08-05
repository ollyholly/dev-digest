"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button, Skeleton, EmptyState } from "@devdigest/ui";
import type { Skill } from "@devdigest/shared";
import { useSkillAgents } from "@/lib/hooks/skills";
import { s } from "./styles";

/** Stats tab — "Used by" is real data (GET /skills/:id/agents). Pull
 *  frequency / accept rate / findings have no backing data source yet (no
 *  eval/stats feature exists), so they render a placeholder tile instead of
 *  fabricated numbers. */
export function StatsTab({ skill }: { skill: Skill }) {
  const t = useTranslations("skills");
  const router = useRouter();
  const { data: agents, isLoading } = useSkillAgents(skill.id);

  return (
    <div style={s.wrap}>
      <div style={s.section}>
        <div style={s.tileGrid}>
          <div style={s.tile}>
            <span style={s.tileLabel}>{t("stats.usedBy")}</span>
            <span style={s.tileValue}>{agents ? t("stats.agentsCount", { count: agents.length }) : "—"}</span>
          </div>
          <div style={s.tile}>
            <span style={s.tileLabel}>{t("stats.pullFrequency")}</span>
            <span style={s.tileNoData}>{t("stats.noData")}</span>
          </div>
          <div style={s.tile}>
            <span style={s.tileLabel}>{t("stats.acceptRate")}</span>
            <span style={s.tileNoData}>{t("stats.noData")}</span>
          </div>
          <div style={s.tile}>
            <span style={s.tileLabel}>{t("stats.findings30d")}</span>
            <span style={s.tileNoData}>{t("stats.noData")}</span>
          </div>
        </div>
      </div>

      <div style={s.section}>
        <span style={s.sectionTitle}>{t("stats.agentsUsing")}</span>
        {isLoading && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Skeleton height={40} />
            <Skeleton height={40} />
          </div>
        )}
        {!isLoading && (agents?.length ?? 0) === 0 && (
          <EmptyState icon="Users" title={t("stats.noData")} />
        )}
        {!isLoading &&
          agents?.map((a) => (
            <div key={a.id} style={s.agentRow}>
              <span style={s.agentName}>{a.name}</span>
              <Button kind="secondary" size="sm" onClick={() => router.push(`/agents/${a.id}`)}>
                {t("stats.open")}
              </Button>
            </div>
          ))}
      </div>

      <div style={s.section}>
        <span style={s.sectionTitle}>{t("stats.findingsByCategory")}</span>
        <span style={s.tileNoData}>{t("stats.noData")}</span>
      </div>
    </div>
  );
}
