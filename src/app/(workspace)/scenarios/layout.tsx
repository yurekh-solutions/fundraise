import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Scenario comparison",
  description:
    "Save versioned fundraising scenarios, compare up to three offers side by side and export the comparison as PDF or CSV.",
  alternates: { canonical: "/scenarios" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
