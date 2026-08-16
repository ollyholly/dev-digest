/* FileCard — one collapsible file in the diff: header (path, +/- stat, comment
   count) and, when open, its parsed lines plus any outdated comments. */
"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@devdigest/ui";
import type { SmartDiffFinding } from "@devdigest/shared";
import type { PrFile } from "@/lib/types";
import { AUTO_EXPAND_MAX_LINES } from "../constants";
import { parsePatch, type Line } from "../helpers";
import {
  buildThreads,
  keysForLine,
  partitionThreads,
  type CommentThread,
  type DiffCommentApi,
} from "../comments";
import { s, chevronFor } from "../styles";
import { CodeLine } from "../CodeLine";
import { OutdatedComments } from "../OutdatedComments";

/** Threads anchored to a given parsed line (RIGHT=new, LEFT=old). */
function threadsForLine(ln: Line, matched: Map<string, CommentThread[]>): CommentThread[] {
  if (matched.size === 0) return [];
  const out: CommentThread[] = [];
  for (const key of keysForLine(ln)) {
    const list = matched.get(key);
    if (list) out.push(...list);
  }
  return out;
}

function firstFindingLine(findings: readonly SmartDiffFinding[]): number | null {
  if (findings.length === 0) return null;
  let min = findings[0]!.start_line;
  for (const f of findings) {
    if (f.start_line < min) min = f.start_line;
  }
  return min;
}

function scrollToDiffLine(path: string, line: number): void {
  const expected = `${path}:${line}`;
  for (const node of document.querySelectorAll("[data-diff-line]")) {
    if (node.getAttribute("data-diff-line") === expected) {
      if (typeof node.scrollIntoView === "function") {
        node.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }
  }
}

export function FileCard({
  file,
  commenting,
  findings = [],
  defaultOpen,
}: {
  file: PrFile;
  commenting?: DiffCommentApi;
  findings?: SmartDiffFinding[];
  defaultOpen?: boolean;
}) {
  const t = useTranslations("shell");
  const [open, setOpen] = React.useState(
    defaultOpen ?? ((file.additions ?? 0) + (file.deletions ?? 0) <= AUTO_EXPAND_MAX_LINES),
  );
  const [pendingScrollLine, setPendingScrollLine] = React.useState<number | null>(null);
  const lines = React.useMemo(() => parsePatch(file.patch), [file.patch]);

  // Group this file's comments into threads, then split into ones we can anchor
  // to a rendered line vs. "outdated" (GitHub dropped the line / it's not here).
  const comments = commenting?.comments;
  const { matched, outdated } = React.useMemo(() => {
    if (!comments) return { matched: new Map<string, CommentThread[]>(), outdated: [] };
    const fileThreads = buildThreads(comments.filter((c) => c.path === file.path));
    const renderedKeys = new Set<string>();
    for (const ln of lines) for (const k of keysForLine(ln)) renderedKeys.add(k);
    return partitionThreads(fileThreads, renderedKeys);
  }, [comments, file.path, lines]);

  const commentCount = commenting
    ? commenting.comments.filter((c) => c.path === file.path).length
    : 0;

  React.useEffect(() => {
    if (!open || pendingScrollLine == null) return;
    scrollToDiffLine(file.path, pendingScrollLine);
    setPendingScrollLine(null);
  }, [open, pendingScrollLine, file.path]);

  const onFindingsBadgeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const line = firstFindingLine(findings);
    if (line == null) return;
    setOpen(true);
    setPendingScrollLine(line);
  };

  return (
    <div style={s.fileCard}>
      <div onClick={() => setOpen((o) => !o)} style={s.fileHeader}>
        <Icon.ChevronRight size={13} style={chevronFor(open)} />
        <Icon.FileText size={14} style={s.fileIcon} />
        <span className="mono" style={s.filePath}>
          {file.path}
        </span>
        <span className="mono tnum" style={s.fileStat}>
          <span style={s.addText}>+{file.additions}</span>{" "}
          <span style={s.delText}>−{file.deletions}</span>
        </span>
        {findings.length > 0 && (
          <>
            <span style={s.findingDot} aria-hidden />
            <button type="button" onClick={onFindingsBadgeClick} style={s.findingsBadge}>
              {t("diffViewer.findingsCount", { count: findings.length })}
            </button>
          </>
        )}
        {commentCount > 0 && (
          <span
            style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--text-muted)" }}
          >
            <Icon.MessageSquare size={12} />
            {commentCount}
          </span>
        )}
      </div>
      {open && (
        <div style={s.fileBody}>
          {lines.length === 0 ? (
            <div style={s.noDiff}>{t("diffViewer.noDiffText")}</div>
          ) : (
            lines.map((ln, i) => (
              <CodeLine
                key={`${ln.kind}:${ln.oldNo ?? ""}:${ln.newNo ?? ""}:${i}`}
                ln={ln}
                path={file.path}
                threads={threadsForLine(ln, matched)}
                commenting={commenting}
                findings={findings}
              />
            ))
          )}
          {commenting && commenting.showComments && <OutdatedComments threads={outdated} />}
        </div>
      )}
    </div>
  );
}
