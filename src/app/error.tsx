"use client";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main className="min-h-dvh grid place-items-center px-6 text-center">
      <div className="max-w-md">
        <h1 className="text-xl font-semibold">Something went wrong.</h1>
        <p className="text-sm text-muted-foreground leading-relaxed mt-3">
          The interface hit an unexpected error. Your saved scenarios are
          untouched in this browser — trying again usually resolves it.
        </p>
        <button onClick={reset} className="btn-primary px-5 py-3 text-sm mt-6">
          Try again
        </button>
      </div>
    </main>
  );
}
