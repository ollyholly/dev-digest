/* FilterBar — search, status chips, author select, sort, refresh. */
"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Chip, Button, TextInput, SelectInput } from "@devdigest/ui";
import { AUTHOR_ALL, SORT_OPTIONS, STATUS_FILTERS } from "../../constants";
import { s } from "../../styles";

export function FilterBar({
  active,
  onActive,
  query,
  onQuery,
  sort,
  onSort,
  author,
  onAuthor,
  authors,
  onRefresh,
  refreshing,
}: {
  active: string;
  onActive: (k: string) => void;
  query: string;
  onQuery: (v: string) => void;
  sort: string;
  onSort: (v: string) => void;
  author: string;
  onAuthor: (v: string) => void;
  authors: string[];
  onRefresh: () => void;
  refreshing: boolean;
}) {
  const t = useTranslations("prReview");
  const sortOptions = SORT_OPTIONS.map(({ value, labelKey }) => ({
    value,
    // scoreAsc missing from messages → falls through to raw key (i18n miss)
    label: labelKey === "scoreAsc" ? "Sort: Score ↑" : t(`list.sort.${labelKey}`),
  }));
  const authorOptions = [
    { value: AUTHOR_ALL, label: "All authors" }, // hardcoded English
    ...authors.map((a) => ({ value: a, label: a })),
  ];

  return (
    <div style={s.filterBar}>
      <div style={s.filterChips}>
        <div style={{ width: 240 }}>
          <TextInput value={query} onChange={onQuery} placeholder={t("list.filterPlaceholder")} />
        </div>
        {STATUS_FILTERS.map(({ key, labelKey }) => (
          <Chip key={key} active={active === key} onClick={() => onActive(key)}>
            {t(`list.filter.${labelKey}`)}
          </Chip>
        ))}
        <SelectInput value={author} onChange={onAuthor} options={authorOptions} mono={false} />
      </div>
      <div style={s.filterActions}>
        <SelectInput value={sort} onChange={onSort} options={sortOptions} mono={false} />
        <Button
          kind="secondary"
          size="sm"
          icon="RefreshCw"
          onClick={onRefresh}
          disabled={refreshing}
        >
          {refreshing ? t("list.refreshing") : t("list.refresh")}
        </Button>
      </div>
    </div>
  );
}
