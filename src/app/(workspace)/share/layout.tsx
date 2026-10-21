import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shared scenario",
  description:
    "A fundraising scenario shared by link — decoded locally in your browser, nothing uploaded.",
  alternates: { canonical: "/share" },
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
