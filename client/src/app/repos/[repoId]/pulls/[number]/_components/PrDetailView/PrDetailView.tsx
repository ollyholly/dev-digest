import type { PrDetail } from "@devdigest/shared";
import type { Crumb } from "@devdigest/ui";
import { AppShell } from "@/components/app-shell";
import { PrDetailHeader } from "../PrDetailHeader";
import { OverviewTab } from "../OverviewTab";
import { FindingsTab } from "../FindingsTab";
import { DiffTab } from "../DiffTab";
import RunTraceDrawer from "../RunTraceDrawer";
import { usePrDetailOrchestration } from "./usePrDetailOrchestration";
import { GithubLinkProvider } from "./GithubLinkContext";

interface PrDetailViewProps {
  repoId: string;
  number: string;
  prId: string;
  pr: PrDetail;
  repoFullName: string | null;
  crumb: Crumb[];
}

/** The loaded PR detail page body: header + tabs + trace drawer. */
export function PrDetailView({ repoId, number, prId, pr, repoFullName, crumb }: PrDetailViewProps) {
  const {
    tab,
    traceRunId,
    selectedSeverities,
    setTab,
    setParam,
    onSeverityChange,
    refetchReviews,
    prRuns,
    deleteRun,
    cancel,
    liveRunIds,
    reviewRunning,
    invalidateActiveRuns,
    invalidateRunHistory,
    invalidateSmartDiff,
    runs,
    lethalTrifecta,
    findingsCount,
  } = usePrDetailOrchestration(repoId, number, prId);

  return (
    <GithubLinkProvider repoFullName={repoFullName} headSha={pr.head_sha}>
      <AppShell crumb={crumb}>
        <PrDetailHeader
          pr={pr}
          prId={prId}
          tab={tab}
          findingsCount={findingsCount}
          onSetTab={setTab}
          onRunStart={() => setTab("findings")}
          onRunsStarted={() => invalidateActiveRuns()}
        />

        <div style={{ padding: "24px 32px 44px", display: "flex", flexDirection: "column", gap: 24, maxWidth: 1080, margin: "0 auto" }}>
          {tab === "overview" && <OverviewTab prId={prId} prBody={pr.body} />}

          {tab === "findings" && (
            <FindingsTab
              prId={prId}
              liveRun={{ ids: liveRunIds, running: reviewRunning }}
              lethalTrifecta={lethalTrifecta}
              runs={runs}
              prRuns={prRuns}
              prCommits={pr.commits}
              severityFilter={{ selected: selectedSeverities, onChange: onSeverityChange }}
              cancelMutation={cancel}
              onOpenTrace={(id) => setParam("trace", id)}
              onDelete={(id) => {
                if (window.confirm("Delete this run from history? (its logs are removed too)"))
                  deleteRun.mutate(id);
              }}
              onRunDone={() => {
                invalidateActiveRuns();
                invalidateRunHistory();
                refetchReviews();
                invalidateSmartDiff();
              }}
            />
          )}

          {tab === "diff" && (
            <DiffTab
              prId={prId}
              filesCount={pr.files_count}
              files={pr.files}
              canComment={pr.status === "open"}
            />
          )}
        </div>

        {traceRunId && (
          <RunTraceDrawer
            runId={traceRunId}
            prNumber={pr.number}
            findings={runs.find((r) => r.run_id === traceRunId)?.findings ?? []}
            agentName={runs.find((r) => r.run_id === traceRunId)?.agent_name ?? null}
            onClose={() => setParam("trace", null)}
          />
        )}
      </AppShell>
    </GithubLinkProvider>
  );
}
