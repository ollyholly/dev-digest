"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Button, EmptyState, ErrorState, Skeleton } from "@devdigest/ui";
import { AppShell } from "@/components/app-shell";
import { ApiError } from "@/lib/api";
import {
  useConventions,
  useExtractConventions,
} from "@/lib/hooks/conventions";
import { ConventionCard } from "./_components/ConventionCard";
import { CreateSkillFromConventionsModal } from "./_components/CreateSkillFromConventionsModal";
import { ScanSummary } from "./ScanSummary";
import { s } from "./styles";

export interface ConventionsViewProps {
  repoId: string;
  repoName: string;
  defaultBranch: string;
}

export function ConventionsView({
  repoId,
  repoName,
  defaultBranch,
}: ConventionsViewProps) {
  const t = useTranslations("conventions");
  const conventions = useConventions(repoId);
  const extract = useExtractConventions(repoId);
  const [createOpen, setCreateOpen] = React.useState(false);
  const result = conventions.data;
  const candidates = result?.candidates ?? [];
  const accepted = candidates.filter((candidate) => candidate.status === "accepted");
  const acceptedCategories = new Set(accepted.map((candidate) => candidate.category));
  const hasScan =
    result != null &&
    (result.scanned_sha != null ||
      result.considered_files > 0 ||
      result.sampled_files.length > 0 ||
      result.model != null ||
      candidates.length > 0);
  const crumb = [
    { label: t("page.crumbLab") },
    { label: t("page.crumbConventions") },
  ];

  return (
    <AppShell crumb={crumb}>
      {createOpen && (
        <CreateSkillFromConventionsModal
          repoId={repoId}
          repoName={repoName}
          acceptedCount={accepted.length}
          hasMultipleCategories={acceptedCategories.size > 1}
          onClose={() => setCreateOpen(false)}
        />
      )}

      <main style={s.page}>
        <header style={s.header}>
          <div style={s.headerText}>
            <h1 style={s.h1}>{t("page.heading", { repo: repoName })}</h1>
            <p style={s.subtitle}>{t("page.subtitle")}</p>
          </div>
          <div style={s.actions}>
            <Button
              size="sm"
              kind="secondary"
              icon="RefreshCw"
              onClick={() => extract.mutate()}
              loading={extract.isPending}
            >
              {extract.isPending
                ? t("page.scanning")
                : hasScan
                  ? t("page.rescan")
                  : t("page.runExtraction")}
            </Button>
            <Button
              size="sm"
              kind="primary"
              icon="Sparkles"
              disabled={accepted.length === 0}
              onClick={() => setCreateOpen(true)}
            >
              {t("page.createSkill")}
            </Button>
          </div>
        </header>

        {extract.isError && (
          <div role="alert" style={s.extractionError}>
            {extract.error instanceof ApiError
              ? extract.error.message
              : t("page.extractionFailed")}
          </div>
        )}

        {result && <ScanSummary result={result} />}

        {conventions.isLoading ? (
          <div style={s.loading}>
            <Skeleton height={176} />
            <Skeleton height={176} />
            <Skeleton height={176} />
          </div>
        ) : conventions.isError ? (
          <ErrorState
            title={t("page.loadError")}
            body={
              conventions.error instanceof ApiError
                ? conventions.error.message
                : t("page.loadErrorBody")
            }
            onRetry={() => conventions.refetch()}
          />
        ) : candidates.length === 0 ? (
          <EmptyState
            icon="FileText"
            title={t("page.empty.title")}
            body={t("page.empty.body")}
            cta={t("page.empty.cta")}
            onCta={() => extract.mutate()}
            ctaLoading={extract.isPending}
          />
        ) : (
          <>
            <div style={s.candidateMeta}>
              {t("page.candidateCount", { count: candidates.length })}
            </div>
            <div style={s.list}>
              {candidates.map((candidate) => (
                <ConventionCard
                  key={candidate.id}
                  candidate={candidate}
                  repoId={repoId}
                  repoName={repoName}
                  defaultBranch={defaultBranch}
                  scanSha={result?.scanned_sha}
                />
              ))}
            </div>
          </>
        )}
      </main>
    </AppShell>
  );
}
