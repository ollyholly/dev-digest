"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Button, FormField, TextInput } from "@devdigest/ui";
import type { Skill } from "@devdigest/shared";
import { useImportSkillFromUrl } from "../../../../../../lib/hooks/skills";
import { ApiError } from "../../../../../../lib/api";
import { s } from "./styles";

/**
 * Fetches the body server-side and creates the skill DISABLED (the server
 * never enables a URL-imported body — see SkillsService.importFromUrl). That
 * "created but disabled" state IS the confirmation gate: nothing reaches an
 * agent's prompt until a human opens the skill and enables it after vetting.
 */
export function UrlImportTab({ onImported }: { onImported: (skill: Skill) => void }) {
  const t = useTranslations("skills");
  const importUrl = useImportSkillFromUrl();
  const [url, setUrl] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [imported, setImported] = React.useState<Skill | null>(null);

  const submit = async () => {
    setError(null);
    try {
      const skill = await importUrl.mutateAsync({ url });
      setImported(skill);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("drawer.importFailed"));
    }
  };

  if (imported) {
    return (
      <div>
        <div style={s.successNote} role="status" aria-live="polite">
          {t("url.success", { name: imported.name })}
        </div>
        <div style={s.footer}>
          <Button kind="primary" onClick={() => onImported(imported)}>
            {t("drawer.title")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {error && <div style={s.errorNote}>{error}</div>}
      <FormField label={t("url.label")} hint={t("url.hint")} required>
        <TextInput value={url} onChange={setUrl} placeholder={t("url.placeholder")} mono />
      </FormField>
      <div style={s.footer}>
        <Button kind="primary" icon="Globe" onClick={submit} disabled={!url.trim() || importUrl.isPending}>
          {importUrl.isPending ? t("url.fetching") : t("url.import")}
        </Button>
      </div>
    </div>
  );
}
