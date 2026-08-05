import { useRouter, useSearchParams } from "next/navigation";

const VALID_TABS = ["config", "preview", "evals", "stats", "versions"];

/** Tab state for the skill editor lives in `?tab=` so it survives navigation. */
export function useSkillEditorTab(id: string) {
  const search = useSearchParams();
  const router = useRouter();

  const tab = VALID_TABS.includes(search.get("tab") ?? "") ? search.get("tab")! : "config";
  const setTab = (t: string) => {
    const sp = new URLSearchParams(search.toString());
    sp.set("tab", t);
    router.replace(`/skills/${id}?${sp.toString()}`);
  };

  return { tab, setTab };
}
