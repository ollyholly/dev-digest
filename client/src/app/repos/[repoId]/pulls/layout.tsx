import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pull Requests",
};

export default function PullsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
