"use client";

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
      if ((file.findings?.length ?? 0) > 0) return true;
      return file.additions + file.deletions <= AUTO_EXPAND_MAX_LINES;
    default: {
      const _exhaustive: never = role;
      return _exhaustive;
    }
  }
}

function prFileFor(smartFile: SmartDiffFile, files: PrFile[]): PrFile {
  const match = files.find((f) => f.path === smartFile.path);
  return {
    path: smartFile.path,
    additions: match?.additions ?? smartFile.additions,
    deletions: match?.deletions ?? smartFile.deletions,
    patch: match?.patch,
  };
}

function SmartDiffGroup({
  role,
  files,
  prFiles,
  commenting,
}: {
  role: SmartDiffRole;
  files: SmartDiffFile[];
  prFiles: PrFile[];
  commenting?: DiffCommentApi;
}) {
  const t = useTranslations("prReview.smartDiff");
  return (
    <section style={s.group}>
      <header style={s.groupHeader}>
        <span style={{ ...s.groupLabel, color: ROLE_COLOR[role] }}>{t(ROLE_LABEL_KEY[role])}</span>
        <span style={s.groupSubtitle}>{t(ROLE_SUBTITLE_KEY[role])}</span>
        <span style={s.groupCount}>{t("filesCount", { count: files.length })}</span>
      </header>
      {files.map((sf) => (
        <FileCard
          key={sf.path}
          file={prFileFor(sf, prFiles)}
          commenting={commenting}
          findings={sf.findings ?? []}
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

  if (!prId || isPending || isError || !data) return null;
  if (data.groups.length === 0) return <div style={s.empty}>{t("groupedByRole")}</div>;

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
          prFiles={files}
          commenting={commenting}
        />
      ))}
    </div>
  );
}
