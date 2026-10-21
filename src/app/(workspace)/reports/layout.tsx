import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reports & exports",
  description:
    "Generate consistent PDF, CSV and JSON reports from one normalized dataset — assumptions, results and a formula appendix.",
  alternates: { canonical: "/reports" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
