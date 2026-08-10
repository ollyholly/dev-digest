import { useTranslations } from "next-intl";
import type { ConventionExtractionResult } from "@devdigest/shared";
import { s } from "./styles";

export function ScanSummary({
  result,
}: {
  result: Pick<
    ConventionExtractionResult,
    "proposed" | "verified" | "dropped" | "sampled_files" | "considered_files"
  >;
}) {
  const t = useTranslations("conventions");
  const items = [
    { value: result.proposed, label: t("summary.proposed") },
    { value: result.verified, label: t("summary.verified") },
    { value: result.dropped, label: t("summary.dropped") },
    {
      value: `${result.sampled_files.length}/${result.considered_files}`,
      label: t("summary.sampled"),
    },
  ];

  return (
    <div style={s.summary} aria-label={t("summary.label")}>
      {items.map((item, index) => (
        <div
          key={item.label}
          style={index === items.length - 1 ? s.summaryItemLast : s.summaryItem}
        >
          <span style={s.summaryValue}>{item.value}</span>
          <span style={s.summaryLabel}>{item.label}</span>
        </div>
      ))}
    </div>
  );
}
