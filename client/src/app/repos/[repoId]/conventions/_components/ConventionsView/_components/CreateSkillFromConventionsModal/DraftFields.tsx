import { useTranslations } from "next-intl";
import { FormField, SelectInput, TextInput, Toggle } from "@devdigest/ui";
import type { EditableConventionDraft } from "./types";
import { s } from "./styles";

function markdownFilename(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${slug || "conventions"}.md`;
}

function estimateTokens(body: string): number {
  return Math.ceil(body.length / 4);
}

export function DraftFields({
  draft,
  index,
  multiple,
  onChange,
}: {
  draft: EditableConventionDraft;
  index: number;
  multiple: boolean;
  onChange: (next: EditableConventionDraft) => void;
}) {
  const t = useTranslations("conventions");
  const update = <K extends keyof EditableConventionDraft>(
    field: K,
    value: EditableConventionDraft[K],
  ) => onChange({ ...draft, [field]: value });
  const bodyId = `convention-skill-body-${index}`;

  return (
    <section style={s.draft(multiple)}>
      {multiple && (
        <div style={s.draftHeading}>
          {draft.category ?? t("modal.mergedDraft")}
        </div>
      )}

      <FormField label={t("modal.fields.name")} required>
        <TextInput
          value={draft.name}
          onChange={(value) => update("name", value)}
          placeholder={t("modal.fields.namePlaceholder")}
          required
        />
      </FormField>

      <FormField label={t("modal.fields.description")}>
        <TextInput
          value={draft.description}
          onChange={(value) => update("description", value)}
          placeholder={t("modal.fields.descriptionPlaceholder")}
        />
      </FormField>

      <div style={s.fieldRow}>
        <FormField label={t("modal.fields.type")}>
          <SelectInput
            value="convention"
            options={[{ value: "convention", label: t("modal.fields.typeConvention") }]}
          />
        </FormField>
        <FormField label={t("modal.fields.enabled")}>
          <div style={s.enabled}>
            <span>{draft.enabled ? t("modal.enabled") : t("modal.disabled")}</span>
            <Toggle
              on={draft.enabled}
              onChange={(value) => update("enabled", value)}
              aria-label={t("modal.fields.enabled")}
              size={16}
            />
          </div>
        </FormField>
      </div>

      <FormField label={t("modal.fields.body")} required id={bodyId}>
        <div style={s.bodyEditor}>
          <div style={s.bodyEditorHeader}>
            <span style={s.filename}>{markdownFilename(draft.name)}</span>
            <span style={s.tokens}>
              {t("modal.tokens", { count: estimateTokens(draft.body) })}
            </span>
          </div>
          <textarea
            id={bodyId}
            value={draft.body}
            onChange={(event) => update("body", event.target.value)}
            rows={11}
            spellCheck={false}
            required
            style={s.textarea}
          />
        </div>
      </FormField>
    </section>
  );
}
