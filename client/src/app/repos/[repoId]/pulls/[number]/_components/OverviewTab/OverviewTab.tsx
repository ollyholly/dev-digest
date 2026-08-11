"use client";

import React from "react";
import { SectionLabel } from "@devdigest/ui";
import { intentFromPrRecord, useEnsureIntent, usePrIntent } from "@/lib/hooks/intent";
import { ApiError } from "@/lib/api";
import { IntentCard } from "./_components/IntentCard";
import { s } from "./styles";

interface OverviewTabProps {
  prId: string;
  prBody: string | null | undefined;
}

export function OverviewTab({ prId, prBody }: OverviewTabProps) {
  const cached = usePrIntent(prId);
  const ensure = useEnsureIntent(prId);

  React.useEffect(() => {
    if (!prId) return;
    ensure.mutate({ force: false });
    // Mount-once lazy ensure; regenerate uses the same mutation with force:true.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prId]);

  const intent = ensure.data?.intent ?? (cached.data ? intentFromPrRecord(cached.data) : undefined);
  const model = ensure.data?.model ?? cached.data?.model ?? null;

  const errMsg =
    ensure.error instanceof ApiError
      ? ensure.error.message
      : ensure.error
        ? String(ensure.error)
        : null;

  return (
    <>
      <IntentCard
        intent={intent}
        model={model}
        loading={ensure.isPending && !intent}
        error={errMsg}
        regenerating={ensure.isPending && !!intent}
        onRegenerate={() => ensure.mutate({ force: true })}
      />

      {prBody && (
        <section>
          <SectionLabel icon="MessageSquare">Description</SectionLabel>
          <div style={s.descriptionBox}>{prBody}</div>
        </section>
      )}
    </>
  );
}
