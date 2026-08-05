"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Button, FormField, TextInput, Textarea } from "@devdigest/ui";
import { useCreateSkill } from "../../../../../../lib/hooks/skills";
import { ApiError } from "../../../../../../lib/api";
import { DEFAULT_SKILL_TYPE } from "./constants";
import { s } from "./styles";

/** Paste/upload a markdown skill body — first-party content, enabled on create. */
export function FileImportTab({ onImported }: { onImported: () => void }) {
  const t = useTranslations("skills");
  const create = useCreateSkill();
  const [name, setName] = React.useState("");
  const [body, setBody] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const onFileSelected = async (file: File | undefined) => {
    if (!file) return;
    const text = await file.text();
    setBody(text);
    if (!name.trim()) setName(file.name.replace(/\.md$/i, ""));
  };

  const submit = async () => {
    setError(null);
    try {
      await create.mutateAsync({
        name: name.trim() || undefined,
        type: DEFAULT_SKILL_TYPE,
        body,
      });
      onImported();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("drawer.importFailed"));
    }
  };

  return (
    <div>
      {error && <div style={s.errorNote}>{error}</div>}
      <FormField label={t("file.nameLabel")} hint={t("file.nameHint")}>
        <TextInput value={name} onChange={setName} placeholder={t("file.namePlaceholder")} mono />
      </FormField>
      <FormField
        label={t("file.bodyLabel")}
        hint={t("file.bodyHint")}
        required
        right={
          <Button kind="ghost" size="sm" icon="Upload" onClick={() => fileInputRef.current?.click()}>
            Upload .md
          </Button>
        }
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".md,.markdown,text/markdown,text/plain"
          onChange={(e) => onFileSelected(e.target.files?.[0])}
          style={{ display: "none" }}
        />
        <Textarea value={body} onChange={setBody} rows={12} mono placeholder={t("file.bodyPlaceholder")} />
      </FormField>
      <div style={s.footer}>
        <Button kind="primary" icon="Upload" onClick={submit} disabled={!body.trim() || create.isPending}>
          {create.isPending ? t("file.importing") : t("file.import")}
        </Button>
      </div>
    </div>
  );
}
