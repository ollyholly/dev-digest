"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { EmptyState } from "@devdigest/ui";

/** Evals tab — stub only. No eval feature exists yet; do not fetch or fake
 *  any data here, just point at the future Eval Dashboard. */
export function EvalsTab() {
  const t = useTranslations("skills");
  return (
    <EmptyState icon="FlaskConical" title={t("evals.comingSoonTitle")} body={t("evals.comingSoonBody")} />
  );
}
