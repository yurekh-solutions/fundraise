import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-dvh grid place-items-center px-6 text-center">
      <div className="max-w-md">
        <p className="brand-logo text-[64px] leading-none text-primary">404</p>
        <h1 className="text-xl font-semibold mt-4">This page doesn’t exist.</h1>
        <p className="text-sm text-muted-foreground leading-relaxed mt-3">
          The link may be outdated or mistyped. Your saved scenarios are safe in
          this browser.
        </p>
        <div className="flex gap-2 justify-center mt-6">
          <Link href="/" className="btn-primary px-5 py-3 text-sm">
            Homepage
          </Link>
          <Link href="/calculator" className="btn-secondary px-5 py-3 text-sm">
            Open the calculator
          </Link>
        </div>
      </div>
    </main>
  );
}
