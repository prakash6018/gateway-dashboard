import type { ReactNode } from "react";
import { budgetLevel, usd } from "@/lib/format.ts";

export function Card({ title, action, children, className = "" }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-stone-200 bg-white ${className}`}>
      {title && (
        <header className="flex items-center justify-between gap-3 border-b border-stone-100 px-5 py-3.5">
          <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
          {action}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function Stat({ label, value, sub, tone = "default" }: { label: string; value: ReactNode; sub?: ReactNode; tone?: "default" | "warn" | "bad" }) {
  const color = tone === "bad" ? "text-rose-700" : tone === "warn" ? "text-amber-700" : "text-ink";
  return (
    <div className="rounded-xl border border-stone-200 bg-white px-5 py-4">
      <div className="text-xs font-medium text-stone-500">{label}</div>
      <div className={`mt-1.5 text-2xl font-semibold tracking-tight ${color}`}>{value}</div>
      {sub && <div className="mt-1 text-xs text-stone-500">{sub}</div>}
    </div>
  );
}

const meterColor = { ok: "bg-accent", warn: "bg-amber-500", over: "bg-rose-600" };

export function BudgetMeter({ spent, budget, size = "sm" }: { spent: number; budget: number; size?: "sm" | "lg" }) {
  const level = budgetLevel(spent, budget);
  const ratio = budget > 0 ? Math.min(1, spent / budget) : spent > 0 ? 1 : 0;
  return (
    <div>
      <div
        className={`w-full overflow-hidden rounded-full bg-stone-100 ${size === "lg" ? "h-2.5" : "h-1.5"}`}
        role="meter"
        aria-valuemin={0}
        aria-valuemax={budget}
        aria-valuenow={spent}
        aria-label={`${usd(spent)} of ${usd(budget)} budget used`}
      >
        <div className={`h-full rounded-full ${meterColor[level]}`} style={{ width: `${Math.max(ratio * 100, spent > 0 ? 2 : 0)}%` }} />
      </div>
      {size === "lg" && (
        <div className="mt-2 flex justify-between text-xs text-stone-500">
          <span>
            <span className="font-medium text-ink">{usd(spent)}</span> spent
          </span>
          <span>{usd(Math.max(0, budget - spent))} left of {usd(budget)}</span>
        </div>
      )}
    </div>
  );
}

const badgeTone = {
  ok: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  blocked: "bg-rose-50 text-rose-700 ring-rose-600/20",
  budget: "bg-amber-50 text-amber-800 ring-amber-600/25",
  error: "bg-stone-100 text-stone-700 ring-stone-500/20",
  neutral: "bg-stone-100 text-stone-700 ring-stone-500/20",
  accent: "bg-accent-soft text-teal-800 ring-teal-600/20",
};

export function Badge({ tone = "neutral", children }: { tone?: keyof typeof badgeTone; children: ReactNode }) {
  return <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset ${badgeTone[tone]}`}>{children}</span>;
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-stone-200/70 ${className}`} />;
}

export function ErrorState({ error, onRetry }: { error: Error; onRetry?: () => void }) {
  return (
    <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-800">
      <div className="font-medium">Couldn't load this.</div>
      <div className="mt-0.5 text-rose-700">{error.message}</div>
      {onRetry && (
        <button onClick={onRetry} className="mt-3 rounded-md border border-rose-300 bg-white px-3 py-1 text-xs font-medium hover:bg-rose-100">
          Try again
        </button>
      )}
    </div>
  );
}

export function PageHeader({ title, sub, children }: { title: ReactNode; sub?: ReactNode; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight">{title}</h1>
        {sub && <p className="mt-1 text-sm text-stone-500">{sub}</p>}
      </div>
      {children}
    </div>
  );
}
