import { useRouter, useSearchParams } from "next/navigation";

const VALID_TABS = ["config", "skills"];

/** Tab state for the agent editor lives in `?tab=` so it survives navigation. */
export function useAgentEditorTab(id: string) {
  const search = useSearchParams();
  const router = useRouter();

  const tab = VALID_TABS.includes(search.get("tab") ?? "") ? search.get("tab")! : "config";
  const setTab = (t: string) => {
    const sp = new URLSearchParams(search.toString());
    sp.set("tab", t);
    router.replace(`/agents/${id}?${sp.toString()}`);
  };

  return { tab, setTab };
}
