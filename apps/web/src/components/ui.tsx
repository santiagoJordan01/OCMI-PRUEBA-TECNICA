import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-lg border border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow)] ${className}`}
    >
      {children}
    </div>
  );
}

export function Panel({
  children,
  title,
  subtitle,
  action,
}: {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <Card>
      {title ? (
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border-subtle)] px-5 py-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
            {subtitle ? <p className="mt-0.5 text-xs text-[var(--muted)]">{subtitle}</p> : null}
          </div>
          {action}
        </div>
      ) : null}
      <div className="p-5">{children}</div>
    </Card>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h2>
        {description ? (
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-[var(--muted)]">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md";
  loading?: boolean;
}) {
  const { className, disabled, ...rest } = props;

  const variants = {
    primary:
      "bg-[var(--primary)] text-white font-semibold shadow-[0_1px_2px_rgb(15_23_42/0.12),0_4px_12px_rgb(30_58_95/0.18)] hover:bg-[var(--primary-hover)] hover:shadow-[0_2px_4px_rgb(15_23_42/0.14),0_6px_16px_rgb(30_58_95/0.22)] active:scale-[0.98] active:shadow-sm focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 border border-[#152a45]",
    secondary:
      "border border-[var(--border)] bg-white text-slate-700 font-medium hover:bg-slate-50 hover:border-slate-300 shadow-sm active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2",
    danger:
      "border border-red-200 bg-[var(--danger-soft)] text-[var(--danger)] font-medium hover:bg-red-100 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-red-200 focus-visible:ring-offset-2",
    ghost:
      "text-slate-600 font-medium hover:bg-slate-100 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-slate-200 focus-visible:ring-offset-2 border border-transparent",
  };

  const sizes = {
    sm: "min-h-8 gap-1.5 px-3 py-1.5 text-xs",
    md: "min-h-10 gap-2 px-5 py-2.5 text-sm",
  };

  const isDisabled = disabled || loading;

  const spinnerClass =
    variant === "primary"
      ? "border-white/30 border-t-white"
      : "border-slate-300 border-t-slate-600";

  return (
    <button
      {...rest}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={`inline-flex items-center justify-center rounded-md transition-all duration-150 disabled:pointer-events-none disabled:opacity-55 disabled:shadow-none disabled:active:scale-100 focus-visible:outline-none ${variants[variant]} ${sizes[size]} ${className ?? ""}`}
    >
      {loading ? (
        <span
          className={`inline-block h-4 w-4 shrink-0 animate-spin rounded-full border-2 ${spinnerClass}`}
          aria-hidden
        />
      ) : null}
      {children}
    </button>
  );
}

export function Field({
  label,
  children,
  error,
  hint,
}: {
  label: string;
  children: ReactNode;
  error?: string;
  hint?: string;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
        {label}
      </span>
      {children}
      {hint && !error ? <span className="block text-xs text-[var(--muted)]">{hint}</span> : null}
      {error ? <span className="block text-xs text-red-600">{error}</span> : null}
    </label>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition-colors placeholder:text-slate-400 focus:border-[var(--accent)] focus:ring-2 focus:ring-blue-100 ${props.className ?? ""}`}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition-colors focus:border-[var(--accent)] focus:ring-2 focus:ring-blue-100 ${props.className ?? ""}`}
    />
  );
}

export function Checkbox({
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-600">
      <input
        type="checkbox"
        {...props}
        className="h-4 w-4 rounded border-[var(--border)] text-[var(--primary)] focus:ring-blue-200"
      />
      {label}
    </label>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="mb-4 flex gap-3 rounded-md border border-red-200 bg-[var(--danger-soft)] px-4 py-3 text-sm text-red-800">
      <span className="font-semibold">Error</span>
      <span>{message}</span>
    </div>
  );
}

export function LoadingState({ label = "Loading data…" }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 py-8 text-sm text-[var(--muted)]">
      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-[var(--primary)]" />
      {label}
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="rounded-lg border border-dashed border-[var(--border)] bg-slate-50/80 px-6 py-10 text-center">
      <p className="text-sm font-medium text-slate-700">{title}</p>
      {description ? <p className="mt-1 text-sm text-[var(--muted)]">{description}</p> : null}
    </div>
  );
}

const badgeStyles: Record<string, string> = {
  active: "bg-[var(--success-soft)] text-[var(--success)] ring-1 ring-green-200",
  inactive: "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
  pending: "bg-[var(--warning-soft)] text-[var(--warning)] ring-1 ring-amber-200",
  approved: "bg-[var(--success-soft)] text-[var(--success)] ring-1 ring-green-200",
  rejected: "bg-[var(--danger-soft)] text-[var(--danger)] ring-1 ring-red-200",
};

const badgeLabels: Record<string, string> = {
  active: "Active",
  inactive: "Inactive",
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${badgeStyles[status] ?? "bg-slate-100 text-slate-600"}`}
    >
      {badgeLabels[status] ?? status}
    </span>
  );
}

export function DataList({ children }: { children: ReactNode }) {
  return <div className="divide-y divide-[var(--border-subtle)]">{children}</div>;
}

export function DataListItem({
  children,
  actions,
}: {
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 px-5 py-4 transition-colors hover:bg-slate-50/80">
      <div className="min-w-0 flex-1">{children}</div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function StatCard({
  label,
  value,
  accent = "default",
}: {
  label: string;
  value: string;
  accent?: "default" | "primary";
}) {
  return (
    <Card className="overflow-hidden">
      <div
        className={`border-l-4 px-5 py-4 ${accent === "primary" ? "border-[var(--primary)]" : "border-slate-300"}`}
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
          {label}
        </p>
        <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{value}</p>
      </div>
    </Card>
  );
}

export function MetaText({ children }: { children: ReactNode }) {
  return <p className="text-sm text-[var(--muted)]">{children}</p>;
}

export function ItemTitle({ children }: { children: ReactNode }) {
  return <h3 className="font-semibold text-slate-900">{children}</h3>;
}
