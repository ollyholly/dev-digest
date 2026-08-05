/* SkillEditorView — left skill list + 5-tab editor chrome for /skills/:id.
   Mirrors AgentEditorView's shape (sidebar list + header + body). */
"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button, Skeleton, Icon, Badge } from "@devdigest/ui";
import type { Skill } from "@devdigest/shared";
import { SkillCard } from "@/app/skills/_components/SkillCard";
import { TYPE_ICON } from "@/app/skills/_components/SkillCard/constants";
import { SkillEditor } from "../SkillEditor";
import { useSkillEditorTab } from "./useSkillEditorTab";

export interface SkillEditorViewProps {
  id: string;
  skills: Skill[] | undefined;
  skill: Skill | undefined;
  isLoading: boolean;
  onToggleSkill: (id: string, enabled: boolean) => void;
}

export function SkillEditorView({ id, skills, skill, isLoading, onToggleSkill }: SkillEditorViewProps) {
  const t = useTranslations("skills");
  const router = useRouter();
  const { tab, setTab } = useSkillEditorTab(id);

  return (
    <div style={{ display: "flex", height: "calc(100vh - 52px)" }}>
      {/* left: skill list */}
      <div
        style={{
          width: 280,
          flexShrink: 0,
          borderRight: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          background: "var(--bg-surface)",
        }}
      >
        <div style={{ padding: "16px 16px 12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <h1 style={{ fontSize: 18, fontWeight: 700, flex: 1 }}>{t("page.heading")}</h1>
          </div>
        </div>
        <div style={{ flex: 1, overflow: "auto", padding: "0 12px 12px" }}>
          {(skills ?? []).map((sk) => (
            <SkillCard
              key={sk.id}
              skill={sk}
              active={sk.id === id}
              compact
              onClick={() => router.push(`/skills/${sk.id}?tab=${tab}`)}
              onToggle={(enabled) => onToggleSkill(sk.id, enabled)}
            />
          ))}
        </div>
      </div>

      {/* editor */}
      {isLoading || !skill ? (
        <div style={{ flex: 1, padding: 28, display: "flex", flexDirection: "column", gap: 16 }}>
          <Skeleton height={24} width={240} />
          <Skeleton height={200} />
        </div>
      ) : (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, minHeight: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 28px 0", flexShrink: 0 }}>
            {React.createElement(Icon[TYPE_ICON[skill.type]], { size: 18, style: { color: "var(--accent)" } })}
            <h1 style={{ fontSize: 18, fontWeight: 700 }}>{skill.name}</h1>
            <Badge color="var(--text-secondary)" mono>
              {t(`listItem.type.${skill.type}`)}
            </Badge>
            <Badge color="var(--text-secondary)" mono icon="History">
              {t("preview.version", { version: skill.version })}
            </Badge>
            {!skill.enabled && <Badge color="var(--text-muted)">disabled</Badge>}
            <div style={{ marginLeft: "auto" }}>
              <Button kind="secondary" size="sm" icon="FlaskConical" onClick={() => setTab("evals")}>
                {t("detail.runOnEvals")}
              </Button>
            </div>
          </div>
          <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
            <SkillEditor skill={skill} tab={tab} onTab={setTab} />
          </div>
        </div>
      )}
    </div>
  );
}
