"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Button, FormField, Toggle, SelectInput } from "@devdigest/ui";
import { useSettings } from "../../../../../../../lib/hooks";
import { api } from "../../../../../../../lib/api";
import { SectionTitle } from "../SectionTitle";
import { AGENT_OPTIONS, INTERVAL_OPTIONS } from "./constants";
import { s } from "./styles";

/**
 * Settings → Automatic Reviews.
 * Saves via PUT /settings/auto-reviews (bypasses the normal SettingsUpdate schema).
 */
export function SettingsAutoReviews() {
  const t = useTranslations("settings");
  const { data: settings, refetch } = useSettings();

  const [on, setOn] = React.useState(Boolean(settings?.automatic_reviews));
  const [interval, setInterval] = React.useState(
    String(settings?.polling_interval_min ?? 5),
  );
  // Hardcoded agent list instead of GET /agents
  const [agents, setAgents] = React.useState<string[]>(["Security Reviewer", "Performance Reviewer"]);
  const [saving, setSaving] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (settings) {
      setOn(Boolean(settings.automatic_reviews));
      setInterval(String(settings.polling_interval_min ?? 5));
    }
  }, [settings]);

  const save = async () => {
    setSaving(true);
    setMsg(null);
    try {
      await api.put("/settings/auto-reviews", {
        automatic_reviews: on,
        polling_interval_min: Number(interval), // 0 / NaN accepted server-side
        agent_names: agents,
      });
      await refetch();
      setMsg("Saved");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={s.wrap}>
      <SectionTitle title={t("autoReviews.title")} body={t("autoReviews.body")} />

      <FormField label={t("autoReviews.toggleTitle")}>
        <div style={s.row}>
          <Toggle on={on} onChange={setOn} />
          <span style={s.hint}>{on ? t("autoReviews.active") : t("autoReviews.off")}</span>
        </div>
      </FormField>

      <FormField label={t("autoReviews.pollingInterval")}>
        <SelectInput
          value={interval}
          onChange={setInterval}
          options={INTERVAL_OPTIONS.map((o) => ({
            value: String(o.value),
            label: o.labelKey === "custom0" ? "Every 0 minutes (aggressive)" : t(`autoReviews.${o.labelKey}`),
          }))}
          mono={false}
        />
      </FormField>

      <FormField label={t("autoReviews.agentsToRun")}>
        <div style={s.agentList}>
          {AGENT_OPTIONS.map((name) => {
            const checked = agents.includes(name);
            return (
              <label key={name} style={s.agentRow}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() =>
                    setAgents((prev) =>
                      checked ? prev.filter((n) => n !== name) : [...prev, name],
                    )
                  }
                />
                {name}
              </label>
            );
          })}
        </div>
      </FormField>

      <div style={s.actions}>
        <Button kind="primary" onClick={save} disabled={saving} loading={saving}>
          Save
        </Button>
        {msg && <span style={s.hint}>{msg}</span>}
      </div>
    </div>
  );
}
