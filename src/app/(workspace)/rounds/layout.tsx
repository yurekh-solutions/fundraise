import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Round planner",
  description:
    "Model successive priced rounds and pre- or post-money option pools with exact price and share issuance per round.",
  alternates: { canonical: "/rounds" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
