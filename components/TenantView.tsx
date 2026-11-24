"use client";
import { useState, type FormEvent } from "react";
import { useViewer } from "@/app/providers";
import { useTenant, useUpdateTenant, type ModelUsage } from "@/lib/api.ts";
import { compact, pct, relativeTime, usd } from "@/lib/format.ts";
import { EventsTable } from "./EventsTable";
import { PolicyPanel } from "./PolicyPanel";
import { SpendChart } from "./SpendChart";
import { BudgetMeter, Card, ErrorState, PageHeader, Skeleton, Stat } from "./ui";

const RANGES = [7, 30, 90] as const;

export function TenantView({ id }: { id: string }) {
  const [days, setDays] = useState<number>(30);
  const { data, error, isLoading, refetch } = useTenant(id, days);

  if (error) return <ErrorState error={error} onRetry={() => refetch()} />;
  if (isLoading || !data)
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-72" />
        <Skeleton className="h-48" />
      </div>
    );

  const t = data.tenant;
  const periodSpend = data.daily.reduce((s, d) => s + d.costUsd, 0);
  const periodReq = data.daily.reduce((s, d) => s + d.requests, 0);
  const periodBlocked = data.daily.reduce((s, d) => s + d.blocked, 0);

  return (
    <>
      <PageHeader title={t.name} sub={<span className="font-mono text-xs">{t.id}</span>}>
        <div className="inline-flex rounded-lg border border-stone-200 bg-white p-0.5 text-xs" role="group" aria-label="Date range">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setDays(r)}
              aria-pressed={days === r}
              className={`rounded-md px-2.5 py-1 font-medium ${days === r ? "bg-ink text-white" : "text-stone-600 hover:text-ink"}`}
            >
              {r} days
            </button>
          ))}
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <div className="grid grid-cols-3 gap-4">
            <Stat label={`Spend, last ${days} days`} value={usd(periodSpend)} />
            <Stat label="Requests" value={compact(periodReq)} />
            <Stat label="Refused" value={`${pct(periodBlocked, periodReq)}%`} sub={`${compact(periodBlocked)} requests`} tone={pct(periodBlocked, periodReq) > 25 ? "warn" : "default"} />
          </div>
          <Card title="Daily spend">
            <SpendChart data={data.daily} />
          </Card>
          <Card title="This month by model">
            <ModelTable rows={data.byModel} />
          </Card>
          <Card title="Recent requests">
            <EventsTable events={data.events.slice(0, 12)} />
          </Card>
        </div>
        <div className="space-y-5">
          <BudgetCard tenantId={t.id} spent={t.spentUsd} budget={t.monthlyBudgetUsd} />
          <PolicyPanel key={JSON.stringify(t.policy)} tenantId={t.id} policy={t.policy} models={data.models} />
          <Card title="Provider keys">
            {data.keys.length ? (
              <ul className="space-y-2 text-sm">
                {data.keys.map((k) => (
                  <li key={k.provider} className="flex items-center justify-between">
                    <span className="font-medium">{k.provider}</span>
                    <span className="font-mono text-xs text-stone-500">
                      {k.hint} · added {relativeTime(k.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-stone-500">No keys yet. The tenant adds them with PUT /v1/keys/:provider.</p>
            )}
            <p className="mt-3 text-xs text-stone-400">Keys are encrypted in the gateway and never sent to this console.</p>
          </Card>
        </div>
      </div>
    </>
  );
}

function ModelTable({ rows }: { rows: ModelUsage[] }) {
  if (!rows.length) return <p className="text-sm text-stone-500">No spend this month.</p>;
  const total = rows.reduce((s, r) => s + r.costUsd, 0);
  return (
    <table className="w-full text-sm">
      <thead className="text-left text-xs text-stone-500">
        <tr>
          <th className="pb-2 font-medium">Model</th>
          <th className="pb-2 text-right font-medium">Requests</th>
          <th className="pb-2 text-right font-medium">Tokens in</th>
          <th className="pb-2 text-right font-medium">Tokens out</th>
          <th className="pb-2 text-right font-medium">Cost</th>
          <th className="w-28 pb-2 pl-4 font-medium">Share</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-stone-100">
        {rows.map((r) => (
          <tr key={r.model}>
            <td className="py-2.5 font-mono text-xs">{r.model}</td>
            <td className="py-2.5 text-right">{compact(r.requests)}</td>
            <td className="py-2.5 text-right">{compact(r.inputTokens)}</td>
            <td className="py-2.5 text-right">{compact(r.outputTokens)}</td>
            <td className="py-2.5 text-right">{usd(r.costUsd)}</td>
            <td className="py-2.5 pl-4">
              <div className="h-1.5 rounded-full bg-stone-100">
                <div className="h-full rounded-full bg-stone-400" style={{ width: `${pct(r.costUsd, total)}%` }} />
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function BudgetCard({ tenantId, spent, budget }: { tenantId: string; spent: number; budget: number }) {
  const { can } = useViewer();
  const update = useUpdateTenant(tenantId);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(budget));
  const [err, setErr] = useState<string | null>(null);

  function submit(e: FormEvent) {
    e.preventDefault();
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) return setErr("Enter an amount of 0 or more.");
    setErr(null);
    update.mutate({ monthlyBudgetUsd: n }, { onSuccess: () => setEditing(false) });
  }

  return (
    <Card
      title="Monthly budget"
      action={
        can("budget:edit") && !editing ? (
          <button onClick={() => { setValue(String(budget)); setEditing(true); }} className="rounded-md px-2 py-1 text-xs font-medium text-accent hover:bg-accent-soft">
            Change
          </button>
        ) : null
      }
    >
      <BudgetMeter spent={spent} budget={budget} size="lg" />
      {editing && (
        <form onSubmit={submit} className="mt-4 flex items-start gap-2 text-sm">
          <label className="flex-1">
            <span className="sr-only">Monthly budget in USD</span>
            <div className="flex items-center rounded-lg border border-stone-300 focus-within:border-accent">
              <span className="pl-3 text-stone-400">$</span>
              <input autoFocus inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} className="w-full rounded-lg px-1.5 py-1.5 focus:outline-none" />
            </div>
            {(err || update.error) && <p className="mt-1 text-xs text-rose-700">{err ?? update.error?.message}</p>}
          </label>
          <button disabled={update.isPending} className="rounded-lg bg-ink px-3 py-1.5 font-medium text-white disabled:opacity-50">
            Save
          </button>
          <button type="button" onClick={() => setEditing(false)} className="rounded-lg px-2 py-1.5 text-stone-600 hover:bg-stone-100">
            Cancel
          </button>
        </form>
      )}
      <p className="mt-3 text-xs leading-relaxed text-stone-500">
        Each request reserves its worst-case cost first, so the gateway refuses anything that could take spend past this limit.
      </p>
    </Card>
  );
}
