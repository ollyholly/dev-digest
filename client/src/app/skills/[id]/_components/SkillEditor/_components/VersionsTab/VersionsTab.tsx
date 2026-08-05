"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Badge, Skeleton, EmptyState } from "@devdigest/ui";
import type { Skill } from "@devdigest/shared";
import { useSkillVersions } from "@/lib/hooks/skills";
import { s } from "./styles";

/** Versions tab — read-only history of body snapshots. Diff/Restore are a
 *  deliberately deferred scope decision; do not add them here even though
 *  some design mockups show them. */
export function VersionsTab({ skill }: { skill: Skill }) {
  const t = useTranslations("skills");
  const { data: versions, isLoading } = useSkillVersions(skill.id);

  const maxVersion = versions?.length ? Math.max(...versions.map((v) => v.version)) : undefined;
  const sorted = versions ? [...versions].sort((a, b) => b.version - a.version) : undefined;

  return (
    <div style={s.wrap}>
      <div style={s.header}>
        <h2 style={s.h2}>{t("versions.title")}</h2>
        {!isLoading && sorted && sorted.length > 0 && (
          <Badge color="var(--text-secondary)" mono>
            {t("versions.count", { count: sorted.length })}
          </Badge>
        )}
      </div>
      <div style={s.hint}>{t("versions.hint")}</div>
      {isLoading && (
        <>
          <Skeleton height={48} />
          <Skeleton height={48} />
        </>
      )}
      {!isLoading && (sorted?.length ?? 0) === 0 && (
        <EmptyState icon="History" title={t("versions.emptyTitle")} />
      )}
      {!isLoading &&
        sorted?.map((v) => (
          <div key={v.version} style={s.row}>
            <Badge mono color="var(--text-secondary)">
              {t("preview.version", { version: v.version })}
            </Badge>
            <span style={s.date}>{new Date(v.created_at).toLocaleString()}</span>
            {v.version === maxVersion && (
              <Badge color="var(--ok)" bg="var(--ok-bg)">
                {t("versions.current")}
              </Badge>
            )}
          </div>
        ))}
    </div>
  );
}
