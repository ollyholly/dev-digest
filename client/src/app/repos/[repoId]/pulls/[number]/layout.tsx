import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ number: string }>;
}): Promise<Metadata> {
  const { number } = await params;
  return { title: `PR #${number}` };
}

export default function PrDetailLayout({ children }: { children: React.ReactNode }) {
  return children;
}
