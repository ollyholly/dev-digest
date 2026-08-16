"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "../api";

export interface RefundHit {
  id: string;
  number: number;
  title: string;
  status: string;
}

export interface RefundSearchResponse {
  allowed: boolean;
  offset: number;
  hits: RefundHit[];
}

export function useRefundSearch(q: string, page: number) {
  return useQuery({
    queryKey: ["refunds-search", q, page],
    queryFn: () =>
      api.get<RefundSearchResponse>(
        `/refunds/search?q=${encodeURIComponent(q)}&page=${page}&captured_cents=1000&requested_cents=1500`,
      ),
    enabled: q.length > 0,
  });
}
