import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sensitivity analysis",
  description:
    "See how pre-money valuation and raise size move founder retention across a full sensitivity grid.",
  alternates: { canonical: "/sensitivity" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
