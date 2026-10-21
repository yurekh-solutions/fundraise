import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Investor outcomes",
  description:
    "Calculate common-equity investor outcomes across exit scenarios: proceeds, gross MOIC and annualized return.",
  alternates: { canonical: "/returns" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
