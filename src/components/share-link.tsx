"use client";
import { useEffect, useRef, useState } from "react";
import { Copy, ShieldCheck } from "lucide-react";
import { Button, Modal } from "@/components/ui";
import { buildShareUrl, encodeShare } from "@/lib/share";
import { Project } from "@/lib/workspace";

export function buildShareLink(
  origin: string,
  name: string,
  project: Project,
): string {
  return buildShareUrl(origin, encodeShare({ v: 1, name, project }));
}

export function ShareModal({
  open,
  url,
  error,
  onClose,
}: {
  open: boolean;
  url: string;
  error: string;
  onClose: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null),
    [copied, setCopied] = useState(false);
  useEffect(() => {
    if (open) setCopied(false);
  }, [open]);
  return (
    <Modal open={open} title="Share this scenario" onClose={onClose}>
      {error ? (
        <p className="text-sm text-red-600 leading-relaxed">{error}</p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
            This link carries the scenario inside its URL fragment. The
            recipient’s browser decodes it locally — nothing is uploaded to any
            server.
          </p>
          <input
            ref={inputRef}
            readOnly
            aria-label="Shareable link"
            value={url}
            onFocus={(e) => e.currentTarget.select()}
            className="glass-input w-full px-3.5 py-3 text-xs break-all"
          />
          <div className="flex items-center justify-between gap-3 mt-4">
            <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
              <ShieldCheck className="size-3.5 text-primary shrink-0" />
              Fragment only — never sent to a server.
            </p>
            <Button
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(url);
                  setCopied(true);
                } catch {
                  inputRef.current?.focus();
                  inputRef.current?.select();
                }
              }}
            >
              <Copy className="size-4" />
              {copied ? "Copied" : "Copy link"}
            </Button>
          </div>
        </>
      )}
    </Modal>
  );
}
