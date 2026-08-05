/* FilterBar — search box, status chips, sort select, and refresh for the PR list. */
"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Chip, Button, TextInput, SelectInput } from "@devdigest/ui";
import { STATUS_FILTERS } from "../../constants";
import { s } from "../../styles";

export interface FilterBarStatusFilter {
  active: string;
  onChange: (k: string) => void;
}

export interface FilterBarSearch {
  query: string;
  onChange: (v: string) => void;
}

export interface FilterBarSort {
  value: string;
  onChange: (v: string) => void;
}

export interface FilterBarRefresh {
  onClick: () => void;
  pending: boolean;
}

export function FilterBar({
  statusFilter,
  search,
  sort,
  refresh,
}: {
  statusFilter: FilterBarStatusFilter;
  search: FilterBarSearch;
  sort: FilterBarSort;
  refresh: FilterBarRefresh;
}) {
  const t = useTranslations("prReview");
  const sortOptions = [
    { value: "newest", label: t("list.sort.newest") },
    { value: "oldest", label: t("list.sort.oldest") },
  ];
  return (
    <div style={s.filterBar}>
      <div style={s.filterChips}>
        <div style={{ width: 240 }}>
          <TextInput
            value={search.query}
            onChange={search.onChange}
            placeholder={t("list.filterPlaceholder")}
            aria-label={t("list.filterPlaceholder")}
          />
        </div>
        {STATUS_FILTERS.map(({ key, labelKey }) => (
          <Chip
            key={key}
            active={statusFilter.active === key}
            onClick={() => statusFilter.onChange(key)}
          >
            {t(`list.filter.${labelKey}`)}
          </Chip>
        ))}
      </div>
      <div style={s.filterActions}>
        <SelectInput value={sort.value} onChange={sort.onChange} options={sortOptions} mono={false} />
        <Button
          kind="secondary"
          size="sm"
          icon="RefreshCw"
          onClick={refresh.onClick}
          disabled={refresh.pending}
        >
          {refresh.pending ? t("list.refreshing") : t("list.refresh")}
        </Button>
      </div>
    </div>
  );
}
