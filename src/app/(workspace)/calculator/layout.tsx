import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Round calculator",
  description:
    "Solve pre- or post-money valuation, investment or investor equity for a priced round — plus post-money SAFE and convertible-note conversion estimates with every formula shown.",
  alternates: { canonical: "/calculator" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
