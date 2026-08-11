"use client";

import { useTranslations } from "next-intl";
import { SectionLabel, ConfidenceNum } from "@devdigest/ui";
import type { Intent } from "@devdigest/shared";
import { s } from "../../styles";

interface IntentCardProps {
  intent: Intent | undefined;
  loading: boolean;
  error: string | null;
  regenerating: boolean;
  onRegenerate: () => void;
}

export function IntentCard({
  intent,
  loading,
  error,
  regenerating,
  onRegenerate,
}: IntentCardProps) {
  const t = useTranslations("brief.intentCard");

  return (
    <section>
      <div style={s.intentHeader}>
        <SectionLabel icon="Target">{t("title")}</SectionLabel>
        <button
          type="button"
          onClick={onRegenerate}
          disabled={loading || regenerating}
          style={s.regenerateBtn}
        >
          {regenerating ? t("regenerating") : t("regenerate")}
        </button>
      </div>

      {loading && !intent && <div style={s.intentMuted}>{t("deriving")}</div>}

      {error && !intent && <div style={s.intentError}>{t("failed", { message: error })}</div>}

      {intent && (
        <div style={s.intentBox}>
          <div style={s.intentMeta}>
            <ConfidenceNum value={intent.confidence} />
            <span style={s.intentMode}>{intent.synthesis_mode.replaceAll("_", " ")}</span>
          </div>
          <p style={s.intentSummary}>{intent.intent}</p>

          <IntentList label={t("inScope")} items={intent.in_scope} />
          <IntentList label={t("outOfScope")} items={intent.out_of_scope} />
          <IntentList label={t("riskAreas")} items={intent.risk_areas} />
        </div>
      )}
    </section>
  );
}

function IntentList({ label, items }: { label: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div style={s.intentListBlock}>
      <div style={s.intentListLabel}>{label}</div>
      <ul style={s.intentList}>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
