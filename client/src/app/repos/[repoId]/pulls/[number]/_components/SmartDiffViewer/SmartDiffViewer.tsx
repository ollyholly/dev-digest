"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import type { PrFile, SmartDiffFile, SmartDiffRole } from "@devdigest/shared";
import { FileCard, type DiffCommentApi } from "@/components/diff-viewer";
import { AUTO_EXPAND_MAX_LINES } from "@/components/diff-viewer/constants";
import { useSmartDiff } from "@/lib/hooks/smart-diff";
import { ROLE_COLOR, ROLE_LABEL_KEY, ROLE_SUBTITLE_KEY } from "./constants";
import { s } from "./styles";

function defaultOpenForSmartFile(
  role: SmartDiffRole,
  file: Pick<SmartDiffFile, "additions" | "deletions" | "findings">,
): boolean {
  switch (role) {
    case "boilerplate":
      return false;
    case "core":
    case "wiring":
      if (file.findings.length > 0) return true;
      return file.additions + file.deletions <= AUTO_EXPAND_MAX_LINES;
    default: {
      const _exhaustive: never = role;
      return _exhaustive;
    }
  }
}

function SmartDiffGroup({
  role,
  files,
  byPath,
  commenting,
}: {
  role: SmartDiffRole;
  files: SmartDiffFile[];
  byPath: Map<string, PrFile>;
  commenting?: DiffCommentApi;
}) {
  const t = useTranslations("prReview.smartDiff");
  const present = files.flatMap((sf) => {
    const prFile = byPath.get(sf.path);
    return prFile ? [{ sf, prFile }] : [];
  });
  return (
    <section style={s.group}>
      <header style={s.groupHeader}>
        <span style={{ ...s.groupLabel, color: ROLE_COLOR[role] }}>{t(ROLE_LABEL_KEY[role])}</span>
        <span style={s.groupSubtitle}>{t(ROLE_SUBTITLE_KEY[role])}</span>
        <span style={s.groupCount}>{t("filesCount", { count: present.length })}</span>
      </header>
      {present.map(({ sf, prFile }) => (
        <FileCard
          key={sf.path}
          file={prFile}
          commenting={commenting}
          findings={sf.findings}
          defaultOpen={defaultOpenForSmartFile(role, sf)}
        />
      ))}
    </section>
  );
}

export function SmartDiffViewer({
  prId,
  files,
  commenting,
}: {
  prId: string | null;
  files: PrFile[];
  commenting?: DiffCommentApi;
}) {
  const t = useTranslations("prReview.smartDiff");
  const { data, isPending, isError } = useSmartDiff(prId);
  const byPath = useMemo(() => new Map(files.map((f) => [f.path, f])), [files]);

  if (!prId) return null;
  if (isPending) return <div style={s.empty}>{t("loading")}</div>;
  if (isError) return <div style={s.empty}>{t("loadError")}</div>;
  if (!data || data.groups.length === 0) return <div style={s.empty}>{t("empty")}</div>;

  return (
    <div style={s.root}>
      {data.split_suggestion.too_big && (
        <div role="status" style={s.banner}>
          <div style={s.bannerTitle}>
            {t("largeTitle", { lines: data.split_suggestion.total_lines })}
          </div>
          <div style={s.bannerBody}>{t("largeBody", { lines: data.split_suggestion.total_lines })}</div>
          {data.split_suggestion.proposed_splits.length > 0 && (
            <ul style={s.splitList}>
              {data.split_suggestion.proposed_splits.map((split) => (
                <li key={split.name}>
                  {split.name}: {split.files.join(", ")}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {data.groups.map((group) => (
        <SmartDiffGroup
          key={group.role}
          role={group.role}
          files={group.files}
          byPath={byPath}
          commenting={commenting}
        />
      ))}
    </div>
  );
}
