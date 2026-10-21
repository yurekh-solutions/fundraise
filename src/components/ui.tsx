"use client";
import { ReactNode, useEffect, useId, useRef } from "react";
import {
  X,
  ArrowUpRight,
  Info,
  CheckCircle2,
  AlertCircle,
  Download,
} from "lucide-react";
import Link from "next/link";
import { Report, download, reportCsv } from "@/lib/report";
import { useWorkspace } from "./workspace-provider";
import { useState } from "react";

export function Button({
  children,
  onClick,
  variant = "primary",
  disabled,
  className = "",
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm cursor-pointer ${variant === "danger" ? "rounded-[.625rem] bg-red-50 text-red-700 hover:bg-red-100" : variant === "secondary" ? "btn-secondary" : "btn-primary"} ${className}`}
    >
      {children}
    </button>
  );
}
export function Field({
  label,
  value,
  onChange,
  error,
  hint,
  suffix,
  readOnly,
  type = "text",
  placeholder = "Not provided",
  className = "",
}: {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  error?: string;
  hint?: string;
  suffix?: string;
  readOnly?: boolean;
  type?: string;
  placeholder?: string;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={className}>
      <label
        htmlFor={id}
        className="mb-1.5 flex items-center justify-between gap-2 text-sm font-medium"
      >
        {label}
        {readOnly && (
          <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">
            Calculated
          </span>
        )}
      </label>
      <div className="relative">
        <input
          id={id}
          type={type}
          inputMode={
            type === "text" && !label.toLowerCase().includes("name")
              ? "decimal"
              : undefined
          }
          value={value}
          readOnly={readOnly}
          onChange={(e) => onChange?.(e.target.value)}
          aria-invalid={!!error}
          aria-describedby={error || hint ? `${id}-help` : undefined}
          placeholder={placeholder}
          className={`glass-input w-full px-3.5 py-3 text-sm tabular-nums min-w-0 ${suffix ? "pr-16" : ""}`}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
      {(error || hint) && (
        <p
          id={`${id}-help`}
          className={`mt-1.5 text-xs leading-relaxed ${error ? "text-red-600" : "text-muted-foreground"}`}
        >
          {error || hint}
        </p>
      )}
    </div>
  );
}
export function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium mb-1.5">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-3 text-sm min-w-0"
      >
        {options.map((o) => (
          <option value={o.value} key={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
export function Card({
  children,
  title,
  description,
  action,
  className = "",
}: {
  children: ReactNode;
  title?: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <section className={`glass-card p-5 sm:p-6 ${className}`}>
      {title && (
        <div className="flex items-start justify-between gap-3 mb-5">
          <div>
            <h2 className="text-base font-semibold">{title}</h2>
            {description && (
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                {description}
              </p>
            )}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-5 mb-7">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[.18em] text-primary mb-2">
          {eyebrow}
        </p>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
          {title}
        </h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-2xl leading-relaxed">
          {description}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">{actions}</div>
    </div>
  );
}
export function Notice({
  children,
  error = false,
}: {
  children: ReactNode;
  error?: boolean;
}) {
  return (
    <div
      role={error ? "alert" : "note"}
      className={`flex gap-3 rounded-xl border px-4 py-3.5 text-sm leading-relaxed ${error ? "status-error" : "bg-violet-50/70 text-violet-900 border-violet-100"}`}
    >
      {error ? (
        <AlertCircle className="size-4 shrink-0 mt-0.5" />
      ) : (
        <Info className="size-4 shrink-0 mt-0.5" />
      )}
      <div>{children}</div>
    </div>
  );
}
export function Errors({ errors }: { errors: string[] }) {
  return errors.length ? <Notice error>{errors.join(" ")}</Notice> : null;
}
export function Status({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] uppercase tracking-wide font-medium ${status === "valid" ? "status-success" : status === "invalid" ? "status-error" : "status-warning"}`}
    >
      {status === "valid" && <CheckCircle2 className="size-3" />}
      {status}
    </span>
  );
}
export function Table({
  headers,
  rows,
  label,
}: {
  headers: string[];
  rows: ReactNode[][];
  label: string;
}) {
  return (
    <div
      role="region"
      aria-label={label}
      tabIndex={0}
      className="overflow-x-auto rounded-xl border border-border"
    >
      <table className="data-table">
        <caption className="sr-only">{label}</caption>
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={i} className={i ? "num" : ""}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((v, j) => (
                <td className={j ? "num" : ""} key={j}>
                  {v}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export function Metric({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <div className="glass-card p-5 min-w-0">
      <p className="text-xs text-muted-foreground mb-2">{label}</p>
      <p className="text-xl sm:text-2xl font-semibold tracking-tight break-words tabular-nums">
        {value}
      </p>
      {note && <p className="text-xs text-muted-foreground mt-2">{note}</p>}
    </div>
  );
}
export function Modal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null),
    id = useId();
  useEffect(() => {
    if (open && !ref.current?.open) ref.current?.showModal();
    if (!open && ref.current?.open) ref.current?.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      aria-labelledby={id}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl p-0 border-0 shadow-2xl bg-white text-foreground"
    >
      <div className="p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 id={id} className="text-lg font-semibold">
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="p-2 rounded-lg hover:bg-secondary"
          >
            <X className="size-4" />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
export function Confirm({
  open,
  title,
  description,
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal open={open} title={title} onClose={onClose}>
      <p className="text-sm text-muted-foreground leading-relaxed mb-6">
        {description}
      </p>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="danger"
          onClick={() => {
            onConfirm();
            onClose();
          }}
        >
          Confirm
        </Button>
      </div>
    </Modal>
  );
}
export function Empty({
  title,
  description,
  href,
  action,
}: {
  title: string;
  description: string;
  href?: string;
  action?: ReactNode;
}) {
  return (
    <div className="glass-card px-6 py-14 text-center">
      <div className="bg-violet-50 text-primary size-14 rounded-2xl grid place-items-center mx-auto mb-4">
        <ArrowUpRight className="size-6" />
      </div>
      <h2 className="font-semibold text-lg">{title}</h2>
      <p className="text-sm text-muted-foreground max-w-md mx-auto mt-2 mb-5 leading-relaxed">
        {description}
      </p>
      {href && (
        <Link href={href} className="btn-primary inline-flex px-5 py-3 text-sm">
          Open calculator
        </Link>
      )}
      {action}
    </div>
  );
}
export function ExportButtons({ reports }: { reports: Report[] }) {
  const { notify } = useWorkspace(),
    [busy, setBusy] = useState(false);
  const disabled = !reports.length || reports.some((r) => r.blocked);
  async function pdf() {
    setBusy(true);
    try {
      const { exportPdf } = await import("@/lib/pdf");
      await exportPdf(reports);
      notify("PDF report downloaded.");
    } catch (e) {
      notify(
        e instanceof Error ? e.message : "PDF export failed. Please retry.",
        true,
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="flex flex-wrap gap-2">
      <Button disabled={disabled || busy} onClick={pdf}>
        <Download className="size-4" />
        {busy ? "Generating…" : "Export PDF"}
      </Button>
      <Button
        disabled={disabled}
        variant="secondary"
        onClick={() => {
          try {
            download(
              reportCsv(reports),
              "fundraise-report.csv",
              "text/csv;charset=utf-8",
            );
            notify("CSV report downloaded.");
          } catch (e) {
            notify(String(e), true);
          }
        }}
      >
        CSV
      </Button>
    </div>
  );
}
export function EnableSection({
  section,
  enabled,
  onChange,
}: {
  section: string;
  enabled: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        checked={enabled}
        onChange={(e) => onChange(e.target.checked)}
        className="accent-primary size-4"
      />
      Include {section} in scenario reports
    </label>
  );
}
