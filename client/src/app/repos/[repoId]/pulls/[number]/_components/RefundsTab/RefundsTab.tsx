"use client";

import { useState } from "react";
import { SectionLabel } from "@devdigest/ui";
import { useRefundSearch } from "@/lib/hooks/refunds";
import { s } from "./styles";

export function RefundsTab() {
  const [q, setQ] = useState("");
  const { data, isPending } = useRefundSearch(q, 1);

  return (
    <section style={s.root}>
      <SectionLabel icon="Search">Refund lookup</SectionLabel>
      <input
        style={s.input}
        value={q}
        placeholder="Charge reference or author"
        onChange={(e) => setQ(e.target.value)}
      />
      {isPending && q ? <div style={s.row}>Searching…</div> : null}
      {data?.hits.map((hit) => (
        <div key={hit.id} style={s.row}>
          #{hit.number} {hit.title} ({hit.status})
        </div>
      ))}
    </section>
  );
}
