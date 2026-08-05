"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Icon, Badge, Toggle, TextInput, EmptyState, Skeleton } from "@devdigest/ui";
import type { Agent, Skill } from "@devdigest/shared";
import { useAgentSkills, useSetAgentSkills } from "../../../../../../../lib/hooks/agents";
import { useSkills } from "../../../../../../../lib/hooks/skills";
import { TYPE_COLOR, TYPE_ICON } from "../../../../../../skills/_components/SkillCard/constants";
import { s } from "./styles";

/** Skills tab — attach/detach + reorder the skills injected into this agent's
 *  assembled prompt. No drag-and-drop library exists in this repo, so
 *  reordering uses plain up/down move buttons instead of real drag handles. */
export function SkillsTab({ agent }: { agent: Agent }) {
  const t = useTranslations("agents");
  const router = useRouter();
  const [filter, setFilter] = React.useState("");

  const { data: skills, isLoading: skillsLoading } = useSkills();
  const { data: links, isLoading: linksLoading } = useAgentSkills(agent.id);
  const setAgentSkills = useSetAgentSkills(agent.id);

  const isLoading = skillsLoading || linksLoading;

  if (isLoading) {
    return (
      <div style={s.wrap}>
        <div style={s.skeletonRow}>
          <Skeleton height={20} width={140} />
          <Skeleton height={36} />
          <Skeleton height={48} />
          <Skeleton height={48} />
          <Skeleton height={48} />
        </div>
      </div>
    );
  }

  if (!skills || skills.length === 0) {
    return (
      <div style={s.wrap}>
        <EmptyState
          icon="Sparkles"
          title={t("skills.title")}
          body={t("skills.orderHint")}
          cta="Go to Skills"
          onCta={() => router.push("/skills")}
        />
      </div>
    );
  }

  const linkedOrder = [...(links ?? [])].sort((a, b) => a.order - b.order);
  const linkedIds = linkedOrder.map((l) => l.skill_id);
  const linkedIdSet = new Set(linkedIds);

  const byId = new Map<string, Skill>(skills.map((sk) => [sk.id, sk]));
  const linkedSkills = linkedIds.map((id) => byId.get(id)).filter((sk): sk is Skill => !!sk);
  const unlinkedSkills = skills
    .filter((sk) => !linkedIdSet.has(sk.id))
    .sort((a, b) => a.name.localeCompare(b.name));

  const q = filter.trim().toLowerCase();
  const matches = (sk: Skill) => !q || sk.name.toLowerCase().includes(q);
  const visibleLinked = linkedSkills.filter(matches);
  const visibleUnlinked = unlinkedSkills.filter(matches);

  const toggle = (skillId: string, checked: boolean) => {
    const next = checked ? [...linkedIds, skillId] : linkedIds.filter((id) => id !== skillId);
    setAgentSkills.mutate(next);
  };

  const move = (skillId: string, dir: -1 | 1) => {
    const idx = linkedIds.indexOf(skillId);
    const target = idx + dir;
    if (idx < 0 || target < 0 || target >= linkedIds.length) return;
    const next = [...linkedIds];
    const tmp = next[idx]!;
    next[idx] = next[target]!;
    next[target] = tmp;
    setAgentSkills.mutate(next);
  };

  return (
    <div style={s.wrap}>
      <div style={s.header}>
        <h2 style={s.h2}>{t("skills.title")}</h2>
        <Badge>{t("skills.enabledCount", { linked: linkedIds.length, total: skills.length })}</Badge>
      </div>
      <div style={s.filterRow}>
        <TextInput value={filter} onChange={setFilter} placeholder={t("skills.filterPlaceholder")} />
      </div>
      <div style={s.hint}>{t("skills.orderHint")}</div>
      <div style={s.list}>
        {visibleLinked.map((sk) => {
          // Reorder position must be derived from the FULL linked order, not
          // the filtered `visibleLinked` index — otherwise an active filter
          // hides sibling rows and both the up/down enabled state and the
          // swap target become wrong (see agent-editor SkillsTab reorder bug).
          const fullIdx = linkedIds.indexOf(sk.id);
          return (
            <SkillRow
              key={sk.id}
              skill={sk}
              linked
              onToggle={(checked) => toggle(sk.id, checked)}
              onMoveUp={() => move(sk.id, -1)}
              onMoveDown={() => move(sk.id, 1)}
              canMoveUp={fullIdx > 0}
              canMoveDown={fullIdx < linkedIds.length - 1}
            />
          );
        })}
        {visibleUnlinked.map((sk) => (
          <SkillRow key={sk.id} skill={sk} linked={false} onToggle={(checked) => toggle(sk.id, checked)} />
        ))}
      </div>
    </div>
  );
}

function SkillRow({
  skill,
  linked,
  onToggle,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}: {
  skill: Skill;
  linked: boolean;
  onToggle: (checked: boolean) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
}) {
  const t = useTranslations("agents");
  const color = TYPE_COLOR[skill.type];
  const TypeIcon = Icon[TYPE_ICON[skill.type]];

  return (
    <div style={s.row(linked)}>
      <Toggle
        on={linked}
        onChange={onToggle}
        size={14}
        aria-label={t(linked ? "skills.detach" : "skills.attach", { name: skill.name })}
      />
      <div style={s.iconBox(color)}>
        <TypeIcon size={15} />
      </div>
      <span className="mono" style={s.name}>
        {skill.name}
      </span>
      <Badge color={color} bg={color + "1a"}>
        {skill.type}
      </Badge>
      {linked && (
        <div style={s.reorderGroup}>
          <button
            type="button"
            style={s.reorderBtn(!canMoveUp)}
            disabled={!canMoveUp}
            onClick={onMoveUp}
            aria-label={t("skills.moveUp", { name: skill.name })}
          >
            <Icon.ArrowUp size={14} />
          </button>
          <button
            type="button"
            style={s.reorderBtn(!canMoveDown)}
            disabled={!canMoveDown}
            onClick={onMoveDown}
            aria-label={t("skills.moveDown", { name: skill.name })}
          >
            <Icon.ArrowDown size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
