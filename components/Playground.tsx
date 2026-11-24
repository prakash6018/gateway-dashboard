"use client";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useEstimate, useTenants, type EstimateResult } from "@/lib/api.ts";
import { usd } from "@/lib/format.ts";
import { estimateInputSchema, fieldErrors } from "@/lib/schemas.ts";
import { Badge, Card, ErrorState, PageHeader, Skeleton } from "./ui";

const SAMPLE = "Customer asha@example.com (phone 9876543210) says her card 4111 1111 1111 1111 was charged twice. Draft a reply.";

export function Playground() {
  const tenants = useTenants();
  const [tenantId, setTenantId] = useState("");
  const [model, setModel] = useState("");
  const [system, setSystem] = useState("You are a helpful support assistant.");
  const [prompt, setPrompt] = useState(SAMPLE);
  const [maxTokens, setMaxTokens] = useState(400);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const estimate = useEstimate(tenantId);

  const tenant = tenants.data?.tenants.find((t) => t.id === tenantId);
  useEffect(() => {
    if (!tenantId && tenants.data?.tenants[0]) setTenantId(tenants.data.tenants[0].id);
  }, [tenants.data, tenantId]);
  useEffect(() => {
    if (tenant && !model) setModel(tenant.policy.allowedModels[0] ?? "");
  }, [tenant, model]);

  function run(e?: FormEvent) {
    e?.preventDefault();
    const parsed = estimateInputSchema.safeParse({ model, system, prompt, maxTokens });
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    estimate.mutate(parsed.data);
  }

  if (tenants.error) return <ErrorState error={tenants.error} onRetry={() => tenants.refetch()} />;
  if (!tenants.data) return <Skeleton className="h-96" />;

  const input = "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm focus:border-accent focus:outline-none";
  return (
    <>
      <PageHeader title="Cost playground" sub="See what a tenant's policy would do with a prompt, and what it would cost, without calling a model." />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        <form onSubmit={run} className="space-y-4 lg:col-span-3" noValidate>
          <Card>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <label>
                <span className="mb-1 block font-medium">Tenant</span>
                <select value={tenantId} onChange={(e) => { setTenantId(e.target.value); setModel(""); estimate.reset(); }} className={input}>
                  {tenants.data.tenants.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </label>
              <label>
                <span className="mb-1 block font-medium">Model</span>
                <select value={model} onChange={(e) => setModel(e.target.value)} className={input}>
                  {tenants.data.models.map((m) => (
                    <option key={m} value={m}>
                      {m}{tenant && !tenant.policy.allowedModels.includes(m) ? " (not allowed)" : ""}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="mt-4 block text-sm">
              <span className="mb-1 block font-medium">System prompt</span>
              <textarea rows={2} value={system} onChange={(e) => setSystem(e.target.value)} className={input} />
            </label>
            <label className="mt-4 block text-sm">
              <span className="mb-1 block font-medium">User prompt</span>
              <textarea
                rows={6}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) run(); }}
                className={`${input} font-mono text-[13px]`}
              />
              {errors.prompt && <p className="mt-1 text-xs text-rose-700">{errors.prompt}</p>}
            </label>
            <label className="mt-4 block text-sm">
              <span className="mb-1 flex justify-between font-medium">
                Max reply tokens <span className="font-normal text-stone-500">{maxTokens.toLocaleString()}</span>
              </span>
              <input type="range" min={50} max={4000} step={50} value={maxTokens} onChange={(e) => setMaxTokens(Number(e.target.value))} className="w-full accent-teal-700" />
              {tenant && maxTokens > tenant.policy.maxOutputTokens && (
                <p className="mt-1 text-xs text-amber-700">Above this tenant's limit of {tenant.policy.maxOutputTokens.toLocaleString()}.</p>
              )}
            </label>
            <div className="mt-5 flex items-center justify-between">
              <span className="text-xs text-stone-400">⌘/Ctrl + Enter</span>
              <button disabled={estimate.isPending || !tenantId} className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-50">
                {estimate.isPending ? "Checking…" : "Check prompt"}
              </button>
            </div>
          </Card>
        </form>
        <div className="lg:col-span-2" aria-live="polite">
          {estimate.error ? (
            <Verdict ok={false} title="The gateway would refuse this" detail={estimate.error.message.charAt(0).toUpperCase() + estimate.error.message.slice(1) + "."} />
          ) : estimate.data ? (
            <Result r={estimate.data} />
          ) : (
            <div className="grid h-full min-h-48 place-items-center rounded-xl border border-dashed border-stone-300 p-6 text-center text-sm text-stone-500">
              Run a check to see the policy verdict, the prompt the model would receive, and the cost.
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function Verdict({ ok, title, detail }: { ok: boolean; title: string; detail?: ReactNode }) {
  return (
    <div className={`rounded-xl border px-5 py-4 ${ok ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50"}`}>
      <div className={`text-sm font-semibold ${ok ? "text-emerald-800" : "text-rose-800"}`}>{title}</div>
      {detail && <div className={`mt-1 text-sm ${ok ? "text-emerald-700" : "text-rose-700"}`}>{detail}</div>}
    </div>
  );
}

function Result({ r }: { r: EstimateResult }) {
  const user = r.redacted.find((m) => m.role === "user")?.content ?? "";
  const parts = useMemo(() => user.split(/(\[[A-Z]+\])/g), [user]);
  const after = r.budget.remainingUsd - r.estimate.worstCaseUsd;
  return (
    <div className="space-y-4">
      {r.budget.fits ? (
        <Verdict ok title="Allowed" detail={r.findings.length ? `${r.findings.length} item${r.findings.length > 1 ? "s" : ""} redacted before sending.` : "No guardrails triggered."} />
      ) : (
        <Verdict ok={false} title="Policy passes, but the budget doesn't" detail="The worst-case cost is more than this tenant has left this month." />
      )}
      <Card title="Cost">
        <dl className="grid grid-cols-2 gap-y-3 text-sm">
          <dt className="text-stone-500">Prompt</dt>
          <dd className="text-right">~{r.estimate.inputTokens.toLocaleString()} tokens</dd>
          <dt className="text-stone-500">Likely</dt>
          <dd className="text-right font-medium">{usd(r.estimate.likelyUsd)}</dd>
          <dt className="text-stone-500">Worst case (reserved)</dt>
          <dd className="text-right font-medium">{usd(r.estimate.worstCaseUsd)}</dd>
          <dt className="text-stone-500">Budget left after</dt>
          <dd className={`text-right ${after < 0 ? "font-medium text-rose-700" : ""}`}>{usd(after)}</dd>
        </dl>
      </Card>
      <Card title="What the model would receive" action={<div className="flex gap-1">{r.findings.map((f, i) => <Badge key={i} tone="accent">{f.rule.replace("pii.", "")}</Badge>)}</div>}>
        <p className="whitespace-pre-wrap font-mono text-[13px] leading-relaxed">
          {parts.map((p, i) => (/^\[[A-Z]+\]$/.test(p) ? <mark key={i} className="rounded bg-accent-soft px-1 text-teal-900">{p}</mark> : <span key={i}>{p}</span>))}
        </p>
      </Card>
    </div>
  );
}
