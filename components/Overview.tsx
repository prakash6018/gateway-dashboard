"use client";
import Link from "next/link";
import { useTenants } from "@/lib/api.ts";
import { budgetLevel, compact, pct, usd } from "@/lib/format.ts";
import { Badge, BudgetMeter, ErrorState, PageHeader, Skeleton, Stat } from "./ui";

export function Overview() {
  const { data, error, isLoading, refetch } = useTenants();
  const month = new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  if (error) return <ErrorState error={error} onRetry={() => refetch()} />;
  if (isLoading || !data)
    return (
      <>
        <PageHeader title="Overview" sub={month} />
        <div className="grid grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="mt-6 h-64" />
      </>
    );

  const t = data.tenants;
  const spent = t.reduce((s, x) => s + x.spentUsd, 0);
  const budget = t.reduce((s, x) => s + x.monthlyBudgetUsd, 0);
  const requests = t.reduce((s, x) => s + x.requests, 0);
  const blocked = t.reduce((s, x) => s + x.blocked, 0);
  const pii = t.reduce((s, x) => s + x.piiRedactions, 0);
  const atRisk = t.filter((x) => budgetLevel(x.spentUsd, x.monthlyBudgetUsd) !== "ok");

  return (
    <>
      <PageHeader title="Overview" sub={`${month} · ${t.length} tenants`} />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Spend this month" value={usd(spent)} sub={`${pct(spent, budget)}% of ${usd(budget)} combined budget`} />
        <Stat label="Requests" value={compact(requests)} sub="through the gateway" />
        <Stat label="Refused before reaching a model" value={`${pct(blocked, requests)}%`} sub={`${compact(blocked)} requests`} tone={pct(blocked, requests) > 25 ? "warn" : "default"} />
        <Stat label="PII redactions" value={compact(pii)} sub="in prompts and replies" />
      </div>

      {atRisk.length > 0 && (
        <div role="status" className="mt-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-3.5 text-sm text-amber-900">
          <span aria-hidden="true" className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-amber-500" />
          <p>
            {atRisk.map((x, i) => (
              <span key={x.id}>
                {i > 0 && ", "}
                <Link href={`/tenants/${x.id}`} className="font-medium underline underline-offset-2">{x.name}</Link> ({pct(x.spentUsd, x.monthlyBudgetUsd)}%)
              </span>
            ))}{" "}
            {atRisk.length > 1 ? "are" : "is"} at or near the monthly budget. Requests that could overspend are refused until the budget is raised or the month resets.
          </p>
        </div>
      )}

      <div className="mt-6 overflow-hidden rounded-xl border border-stone-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-stone-100 text-left text-xs text-stone-500">
            <tr>
              <th className="px-5 py-3 font-medium">Tenant</th>
              <th className="w-[30%] px-5 py-3 font-medium">Budget used</th>
              <th className="px-5 py-3 text-right font-medium">Spent</th>
              <th className="px-5 py-3 text-right font-medium">Requests</th>
              <th className="px-5 py-3 text-right font-medium">Refused</th>
              <th className="px-5 py-3 font-medium">PII</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {t.map((x) => {
              const level = budgetLevel(x.spentUsd, x.monthlyBudgetUsd);
              return (
                <tr key={x.id} className="group hover:bg-stone-50">
                  <td className="px-5 py-3.5">
                    <Link href={`/tenants/${x.id}`} className="font-medium group-hover:underline">
                      {x.name}
                    </Link>
                    <div className="text-xs text-stone-500">{x.policy.allowedModels.join(", ")}</div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <BudgetMeter spent={x.spentUsd} budget={x.monthlyBudgetUsd} />
                      </div>
                      <span className={`w-10 text-right text-xs ${level === "over" ? "font-semibold text-rose-700" : level === "warn" ? "text-amber-700" : "text-stone-500"}`}>
                        {pct(x.spentUsd, x.monthlyBudgetUsd)}%
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    {usd(x.spentUsd)} <span className="text-stone-400">/ {usd(x.monthlyBudgetUsd)}</span>
                  </td>
                  <td className="px-5 py-3.5 text-right">{compact(x.requests)}</td>
                  <td className="px-5 py-3.5 text-right">
                    {compact(x.blocked)} <span className="text-stone-400">({pct(x.blocked, x.requests)}%)</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <Badge tone={x.policy.pii === "block" ? "blocked" : x.policy.pii === "redact" ? "accent" : "neutral"}>{x.policy.pii}</Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
