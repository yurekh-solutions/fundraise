import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Guide & formulas",
  description:
    "The formulas behind fundraising: pre- and post-money math, option pools, dilution, runway, fees and return calculations.",
  alternates: { canonical: "/guide" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
