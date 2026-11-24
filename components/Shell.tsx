"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useViewer } from "@/app/providers";
import { useTenants } from "@/lib/api.ts";
import { budgetLevel } from "@/lib/format.ts";

const dot = { ok: "bg-accent", warn: "bg-amber-500", over: "bg-rose-600" };

export function Shell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const { viewer } = useViewer();
  const tenants = useTenants();
  const item = (href: string, label: string, active: boolean) => (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm ${active ? "bg-stone-100 font-medium text-ink" : "text-stone-600 hover:bg-stone-50 hover:text-ink"}`}
    >
      {label}
    </Link>
  );
  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-stone-200 bg-white px-3 py-4">
        <div className="mb-6 flex items-center gap-2.5 px-2">
          <svg width="24" height="24" viewBox="0 0 26 26" aria-hidden="true">
            <rect width="26" height="26" rx="7" className="fill-ink" />
            <path d="M7 9h12M7 13h8M7 17h5" stroke="#5eead4" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span className="text-[15px] font-semibold tracking-tight">Gateway Console</span>
        </div>
        <nav className="space-y-0.5" aria-label="Main">
          {item("/", "Overview", path === "/")}
          {item("/playground", "Cost playground", path === "/playground")}
        </nav>
        <div className="mt-6 px-2.5 text-[11px] font-semibold uppercase tracking-wider text-stone-400">Tenants</div>
        <nav className="mt-1.5 space-y-0.5 overflow-y-auto" aria-label="Tenants">
          {tenants.data?.tenants.map((t) => (
            <Link
              key={t.id}
              href={`/tenants/${t.id}`}
              aria-current={path === `/tenants/${t.id}` ? "page" : undefined}
              className={`flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm ${path === `/tenants/${t.id}` ? "bg-stone-100 font-medium" : "text-stone-600 hover:bg-stone-50 hover:text-ink"}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${dot[budgetLevel(t.spentUsd, t.monthlyBudgetUsd)]}`} aria-hidden="true" />
              <span className="truncate">{t.name}</span>
            </Link>
          ))}
        </nav>
        <div className="mt-auto flex items-center justify-between gap-2 border-t border-stone-100 px-2 pt-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{viewer?.name}</div>
            <div className="text-xs capitalize text-stone-500">{viewer?.role}</div>
          </div>
          <form action="/api/logout" method="post">
            <button className="rounded-md px-2 py-1 text-xs text-stone-500 hover:bg-stone-100 hover:text-ink">Sign out</button>
          </form>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-8 py-7">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
