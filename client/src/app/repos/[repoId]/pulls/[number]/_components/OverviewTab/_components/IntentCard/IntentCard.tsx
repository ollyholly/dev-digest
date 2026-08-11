"use client";

import { useTranslations } from "next-intl";
import { SectionLabel, ConfidenceNum } from "@devdigest/ui";
import type { Intent, IntentSource } from "@devdigest/shared";
import { s } from "../../styles";

interface IntentCardProps {
  intent: Intent | undefined;
  /** Last computation model (`heuristic` when offline / no API key). */
  model?: string | null;
  loading: boolean;
  error: string | null;
  regenerating: boolean;
  onRegenerate: () => void;
}

export function IntentCard({
  intent,
  model,
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

      {error && <div style={s.intentError}>{t("failed", { message: error })}</div>}

      {intent && (
        <div style={s.intentBox}>
          <div style={s.intentMeta}>
            <ConfidenceNum value={intent.confidence} />
            <span style={s.intentMode}>{intent.synthesis_mode.replaceAll("_", " ")}</span>
            {model && <span style={s.intentModel}>{model}</span>}
          </div>
          <p style={s.intentSummary}>{intent.intent}</p>

          <IntentList label={t("inScope")} items={intent.in_scope} />
          <IntentList label={t("outOfScope")} items={intent.out_of_scope} />
          <IntentList label={t("riskAreas")} items={intent.risk_areas} />

          {intent.missing_inputs.length > 0 && (
            <IntentList label={t("missingInputs")} items={intent.missing_inputs} />
          )}

          {intent.sources.length > 0 && (
            <div style={s.intentListBlock}>
              <div style={s.intentListLabel}>{t("sources")}</div>
              <ul style={s.intentList}>
                {intent.sources.map((src) => (
                  <li key={`${src.kind}:${src.ref}`}>
                    <SourceLine source={src} offlineLabel={t("sourceOffline")} okLabel={t("sourceOk")} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function SourceLine({
  source,
  offlineLabel,
  okLabel,
}: {
  source: IntentSource;
  offlineLabel: string;
  okLabel: string;
}) {
  const status =
    source.fetched_ok === true ? okLabel : source.fetched_ok === false ? offlineLabel : null;
  return (
    <>
      <span style={s.intentSourceKind}>{source.kind}</span>
      {": "}
      <span style={s.intentSourceRef}>{source.ref}</span>
      {status ? ` (${status})` : null}
    </>
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
