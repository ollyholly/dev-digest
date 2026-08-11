import type { Metadata } from "next";
import { SETTINGS_SECTIONS } from "@devdigest/ui/nav";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ section: string }>;
}): Promise<Metadata> {
  const { section } = await params;
  const current = SETTINGS_SECTIONS.find((sec) => sec.key === section);
  return { title: current ? `Settings · ${current.label}` : "Settings" };
}

export default function SettingsSectionLayout({ children }: { children: React.ReactNode }) {
  return children;
}
