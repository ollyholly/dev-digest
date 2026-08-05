"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { FormField, TextInput, SelectInput, Toggle, Button, Badge } from "@devdigest/ui";
import type { Skill, SkillType } from "@devdigest/shared";
import { useUpdateSkill } from "@/lib/hooks/skills";
import { SKILL_TYPE_VALUES } from "./constants";
import { estimateTokens, toKebabCase } from "./helpers";
import { MarkdownEditor } from "./MarkdownEditor";
import { s } from "./styles";

/** Config tab — name/description/type/enabled + a mini code-editor for the
 *  skill body (directive-interface hint on description, per product spec). */
export function ConfigTab({ skill }: { skill: Skill }) {
  const t = useTranslations("skills");
  const update = useUpdateSkill();
  const [name, setName] = React.useState(skill.name);
  const [description, setDescription] = React.useState(skill.description);
  const [type, setType] = React.useState<SkillType>(skill.type);
  const [body, setBody] = React.useState(skill.body);
  const [enabled, setEnabled] = React.useState(skill.enabled);

  // Reset local form when switching skills.
  React.useEffect(() => {
    setName(skill.name);
    setDescription(skill.description);
    setType(skill.type);
    setBody(skill.body);
    setEnabled(skill.enabled);
  }, [skill.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const typeOptions = SKILL_TYPE_VALUES.map((v) => ({ value: v, label: t(`listItem.type.${v}`) }));
  const unsaved = body !== skill.body;
  // Rough client-side estimate (~4 chars/token) — not a real tokenizer, just
  // enough to give a ballpark before saving.
  const tokenCount = estimateTokens(body);

  const save = () =>
    update.mutate({
      id: skill.id,
      patch: { name, description, type, body, enabled },
    });

  return (
    <div style={s.wrap}>
      <div style={s.header}>
        <h2 style={s.h2}>{t("config.title")}</h2>
        <Badge color="var(--text-secondary)" mono icon="History">
          {t("preview.version", { version: skill.version })}
        </Badge>
        <label style={s.enabledLabel}>
          {t("config.enabled")}
          <Toggle on={enabled} onChange={setEnabled} size={16} />
        </label>
      </div>
      <FormField label={t("config.name")} required>
        <TextInput value={name} onChange={setName} />
      </FormField>
      <FormField label={t("config.description")} hint={t("config.descriptionHint")}>
        <TextInput value={description} onChange={setDescription} />
      </FormField>
      <FormField label={t("config.type")}>
        <SelectInput value={type} onChange={(v) => setType(v as SkillType)} options={typeOptions} />
      </FormField>
      <FormField label={t("config.bodyRequired")}>
        <div style={s.bodyEditor}>
          <div style={s.bodyEditorHeader}>
            <span className="mono" style={s.bodyEditorFilename}>
              {toKebabCase(name)}.md
            </span>
            {unsaved && <Badge color="var(--warn)" bg="var(--warn-bg)">{t("config.unsaved")}</Badge>}
            <span style={s.bodyEditorTokens}>{t("config.tokens", { count: tokenCount })}</span>
          </div>
          <MarkdownEditor value={body} onChange={setBody} rows={16} />
        </div>
      </FormField>
      <div style={s.actions}>
        <Button kind="primary" icon="Check" onClick={save} disabled={update.isPending}>
          {update.isPending ? t("config.saving") : t("config.save")}
        </Button>
        {update.isSuccess && (
          <span style={s.savedNote}>{t("config.saved", { version: update.data?.version })}</span>
        )}
      </div>
    </div>
  );
}
