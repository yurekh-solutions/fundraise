import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cap table",
  description:
    "Track founders, shareholders, awards and option pools with basic and fully diluted ownership for every stakeholder.",
  alternates: { canonical: "/cap-table" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
