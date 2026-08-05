"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Drawer } from "@devdigest/ui";
import type { Skill } from "@devdigest/shared";
import { FileImportTab } from "./FileImportTab";
import { UrlImportTab } from "./UrlImportTab";
import { CommunityImportTab } from "./CommunityImportTab";
import { IMPORT_TABS, type ImportTab } from "./constants";
import { s } from "./styles";

export function AddSkillDrawer({
  initialTab = "file",
  onClose,
  onImported,
}: {
  initialTab?: ImportTab;
  onClose: () => void;
  onImported: (skill: Skill) => void;
}) {
  const t = useTranslations("skills");
  const [tab, setTab] = React.useState<ImportTab>(initialTab);

  return (
    <Drawer width={620} title={t("drawer.title")} subtitle={t("drawer.subtitle")} onClose={onClose}>
      <div style={s.tabsBar}>
        {IMPORT_TABS.map((tb) => (
          <button key={tb} onClick={() => setTab(tb)} style={s.tabBtn(tab === tb)}>
            {t(`drawer.tabs.${tb}`)}
          </button>
        ))}
      </div>
      {tab === "file" && <FileImportTab onImported={() => onClose()} />}
      {tab === "url" && <UrlImportTab onImported={(skill) => onImported(skill)} />}
      {tab === "community" && <CommunityImportTab onImported={(skill) => onImported(skill)} />}
    </Drawer>
  );
}
