import { Nav } from "@/components/nav";
import type { ReactNode } from "react";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-800 bg-[var(--header)] text-white shadow-md">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-sm font-bold tracking-tight"
              aria-hidden
            >
              MT
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                Payroll
              </p>
              <h1 className="text-lg font-semibold leading-tight tracking-tight">
                Mini Timesheets
              </h1>
            </div>
          </div>
          <Nav />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>

      <footer className="border-t border-[var(--border)] bg-[var(--card)] py-4">
        <p className="text-center text-xs text-[var(--muted)]">
          OCMI Technical Assessment — timesheet &amp; payroll review
        </p>
      </footer>
    </div>
  );
}
