"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button, Icon, Modal } from "@devdigest/ui";
import type {
  ConventionPromoteInput,
  ConventionSkillDraft,
  ConventionSkillDraftMode,
} from "@devdigest/shared";
import { ApiError } from "@/lib/api";
import {
  useConventionSkillDraft,
  usePromoteConventions,
} from "@/lib/hooks/conventions";
import { DraftFields } from "./DraftFields";
import type { EditableConventionDraft } from "./types";
import { s } from "./styles";

function toEditableDraft(draft: ConventionSkillDraft): EditableConventionDraft {
  return {
    name: draft.name,
    description: draft.description,
    body: draft.body,
    enabled: true,
    category: draft.category ?? null,
  };
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

export interface CreateSkillFromConventionsModalProps {
  repoId: string;
  repoName: string;
  acceptedCount: number;
  hasMultipleCategories: boolean;
  onClose: () => void;
}

export function CreateSkillFromConventionsModal({
  repoId,
  repoName,
  acceptedCount,
  hasMultipleCategories,
  onClose,
}: CreateSkillFromConventionsModalProps) {
  const t = useTranslations("conventions");
  const router = useRouter();
  const [split, setSplit] = React.useState(false);
  const [drafts, setDrafts] = React.useState<EditableConventionDraft[]>([]);
  const [dirty, setDirty] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const mode: ConventionSkillDraftMode = split ? "by-category" : "merged";
  const draftQuery = useConventionSkillDraft(repoId, mode, true);
  const promote = usePromoteConventions(repoId);

  React.useEffect(() => {
    if (!draftQuery.data || dirty) return;
    setDrafts(draftQuery.data.drafts.map(toEditableDraft));
  }, [draftQuery.data, dirty]);

  const toggleSplit = (next: boolean) => {
    setSplit(next);
    setDrafts([]);
    setDirty(false);
    setSubmitError(null);
  };

  const updateDraft = (index: number, next: EditableConventionDraft) => {
    setDirty(true);
    setDrafts((current) =>
      current.map((draft, draftIndex) => (draftIndex === index ? next : draft)),
    );
  };

  const invalid = drafts.length === 0 || drafts.some(
    (draft) => !draft.name.trim() || !draft.body.trim(),
  );

  const submit = async () => {
    setSubmitError(null);
    const input: ConventionPromoteInput = {
      mode,
      drafts: drafts.map((draft) => ({
        name: draft.name,
        description: draft.description,
        body: draft.body,
        enabled: draft.enabled,
        category: draft.category,
      })),
    };

    try {
      const result = await promote.mutateAsync(input);
      const firstSkill = result.skills[0];
      if (!firstSkill) {
        setSubmitError(t("modal.promotionFailed"));
        return;
      }
      onClose();
      router.push(`/skills/${firstSkill.id}?tab=config`);
    } catch (error) {
      setSubmitError(errorMessage(error, t("modal.promotionFailed")));
    }
  };

  return (
    <Modal
      width={820}
      title={t("modal.title")}
      subtitle={t("modal.subtitle")}
      onClose={onClose}
      footer={
        <div style={s.footer}>
          <span style={s.footerHint}>{t("modal.savedHint")}</span>
          <div style={s.footerActions}>
            <Button kind="ghost" onClick={onClose}>
              {t("modal.cancel")}
            </Button>
            <Button
              kind="primary"
              icon="Sparkles"
              onClick={submit}
              loading={promote.isPending}
              disabled={invalid}
            >
              {t("modal.create")}
            </Button>
          </div>
        </div>
      }
    >
      <div style={s.body}>
        <div style={s.info}>
          <Icon.Info size={16} style={s.infoIcon} />
          <span>{t("modal.info", { count: acceptedCount, repo: repoName })}</span>
        </div>

        {hasMultipleCategories && (
          <label style={s.split}>
            <input
              type="checkbox"
              checked={split}
              onChange={(event) => toggleSplit(event.target.checked)}
              style={s.splitCheckbox}
            />
            {t("modal.splitByCategory")}
          </label>
        )}

        {draftQuery.isError && (
          <div role="alert" style={s.error}>
            {errorMessage(draftQuery.error, t("modal.draftFailed"))}
          </div>
        )}
        {submitError && (
          <div role="alert" style={s.error}>
            {submitError}
          </div>
        )}

        {draftQuery.isLoading ? (
          <div style={s.loading}>{t("modal.loadingDraft")}</div>
        ) : drafts.length === 0 ? (
          <div style={s.loading}>{t("modal.noDrafts")}</div>
        ) : (
          drafts.map((draft, index) => (
            <DraftFields
              key={draft.category ?? "merged"}
              draft={draft}
              index={index}
              multiple={drafts.length > 1}
              onChange={(next) => updateDraft(index, next)}
            />
          ))
        )}
      </div>
    </Modal>
  );
}
