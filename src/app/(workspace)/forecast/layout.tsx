import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cash forecast",
  description:
    "Forecast startup cash month by month — hiring, collection delays, funding fees and use of funds across base, upside and downside cases.",
  alternates: { canonical: "/forecast" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
