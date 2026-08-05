/* /agents/:id — Agent Editor (A2, L03). Fetches the agent + agent list and
   delegates sidebar/editor chrome to AgentEditorView. */
"use client";

import { useParams } from "next/navigation";
import { ErrorState } from "@devdigest/ui";
import { AppShell } from "@/components/app-shell";
import { useAgents, useAgent, useUpdateAgent } from "@/lib/hooks/agents";
import { ApiError } from "@/lib/api";
import { AgentEditorView } from "./_components/AgentEditorView";

export default function AgentEditorPage() {
  const params = useParams<{ id: string }>();
  const { id } = params;

  const { data: agents } = useAgents();
  const { data: agent, isLoading, isError, error, refetch } = useAgent(id);
  const update = useUpdateAgent();

  const crumb = [
    { label: "Skills Lab" },
    { label: "Agents", href: "/agents" },
    { label: agent?.name ?? "Agent" },
  ];

  if (isError || (!isLoading && !agent)) {
    return (
      <AppShell crumb={crumb}>
        <ErrorState
          fullScreen
          title="Couldn’t load this agent"
          body={error instanceof ApiError ? error.message : "The agent could not be loaded."}
          onRetry={() => refetch()}
        />
      </AppShell>
    );
  }

  return (
    <AppShell crumb={crumb}>
      <AgentEditorView
        id={id}
        agents={agents}
        agent={agent}
        isLoading={isLoading}
        onToggleAgent={(agentId, enabled) => update.mutate({ id: agentId, patch: { enabled } })}
      />
    </AppShell>
  );
}
