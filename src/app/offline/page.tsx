import type { Metadata } from "next";
import Link from "next/link";
import { WifiOff } from "lucide-react";

export const metadata: Metadata = {
  title: "Offline",
  robots: { index: false, follow: false },
};

export default function Offline() {
  return (
    <main className="min-h-dvh grid place-items-center px-6 text-center">
      <div className="max-w-md">
        <div className="size-14 rounded-2xl bg-violet-50 text-primary border border-violet-100 grid place-items-center mx-auto mb-5">
          <WifiOff className="size-6" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">
          You’re offline.
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed mt-3">
          This page hasn’t been cached yet. Pages you have already visited in
          this browser stay available offline, and your saved data is stored
          locally the whole time.
        </p>
        <Link
          href="/"
          className="btn-primary inline-flex px-5 py-3 text-sm mt-6"
        >
          Go to the homepage
        </Link>
      </div>
    </main>
  );
}
