"use client";
import { useState, type FormEvent, type ReactNode } from "react";
import { useViewer } from "@/app/providers";
import { useUpdateTenant } from "@/lib/api.ts";
import { fieldErrors, parseTerms, policySchema, type Policy } from "@/lib/schemas.ts";
import { Badge, Card } from "./ui";

const piiText = { redact: "Redact before sending", block: "Refuse the request", allow: "Send as is" };

export function PolicyPanel({ tenantId, policy, models }: { tenantId: string; policy: Policy; models: string[] }) {
  const { can } = useViewer();
  const [editing, setEditing] = useState(false);
  const editable = can("policy:edit");
  return (
    <Card
      title="Policy"
      action={
        editable ? (
          !editing && (
            <button onClick={() => setEditing(true)} className="rounded-md px-2 py-1 text-xs font-medium text-accent hover:bg-accent-soft">
              Edit
            </button>
          )
        ) : (
          <span className="text-xs text-stone-400">View only</span>
        )
      }
    >
      {editing ? <PolicyForm tenantId={tenantId} policy={policy} models={models} onDone={() => setEditing(false)} /> : <PolicyView policy={policy} />}
    </Card>
  );
}

function PolicyView({ policy }: { policy: Policy }) {
  const row = (k: string, v: ReactNode) => (
    <div className="flex items-start justify-between gap-4 py-2">
      <dt className="text-stone-500">{k}</dt>
      <dd className="text-right">{v}</dd>
    </div>
  );
  return (
    <dl className="-my-2 divide-y divide-stone-100 text-sm">
      {row("Models", <div className="flex flex-wrap justify-end gap-1">{policy.allowedModels.map((m) => <Badge key={m}>{m}</Badge>)}</div>)}
      {row("Max prompt", `${policy.maxInputTokens.toLocaleString()} tokens`)}
      {row("Max reply", `${policy.maxOutputTokens.toLocaleString()} tokens`)}
      {row("Personal data", piiText[policy.pii])}
      {row("Prompt injection", policy.blockInjection ? "Refused" : "Allowed")}
      {row("Blocked terms", policy.blockedTerms?.length ? policy.blockedTerms.join(", ") : <span className="text-stone-400">None</span>)}
    </dl>
  );
}

function PolicyForm({ tenantId, policy, models, onDone }: { tenantId: string; policy: Policy; models: string[]; onDone: () => void }) {
  const update = useUpdateTenant(tenantId);
  const [allowed, setAllowed] = useState<string[]>(policy.allowedModels);
  const [maxIn, setMaxIn] = useState(String(policy.maxInputTokens));
  const [maxOut, setMaxOut] = useState(String(policy.maxOutputTokens));
  const [pii, setPii] = useState<Policy["pii"]>(policy.pii);
  const [injection, setInjection] = useState(policy.blockInjection);
  const [terms, setTerms] = useState((policy.blockedTerms ?? []).join("\n"));
  const [errors, setErrors] = useState<Record<string, string>>({});

  function submit(e: FormEvent) {
    e.preventDefault();
    const parsed = policySchema.safeParse({
      allowedModels: allowed,
      maxInputTokens: Number(maxIn),
      maxOutputTokens: Number(maxOut),
      pii,
      blockInjection: injection,
      blockedTerms: parseTerms(terms),
    });
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    update.mutate({ policy: parsed.data }, { onSuccess: onDone });
  }

  const input = "w-full rounded-lg border border-stone-300 px-3 py-1.5 text-sm focus:border-accent focus:outline-none";
  const err = (k: string) => errors[k] && <p className="mt-1 text-xs text-rose-700">{errors[k]}</p>;

  return (
    <form onSubmit={submit} className="space-y-4 text-sm" noValidate>
      <fieldset>
        <legend className="mb-1.5 font-medium">Allowed models</legend>
        <div className="space-y-1">
          {models.map((m) => (
            <label key={m} className="flex items-center gap-2">
              <input type="checkbox" checked={allowed.includes(m)} onChange={(e) => setAllowed(e.target.checked ? [...allowed, m] : allowed.filter((x) => x !== m))} className="accent-teal-700" />
              <span className="font-mono text-xs">{m}</span>
            </label>
          ))}
        </div>
        {err("allowedModels")}
      </fieldset>
      <div className="grid grid-cols-2 gap-3">
        <label>
          <span className="mb-1 block font-medium">Max prompt tokens</span>
          <input inputMode="numeric" value={maxIn} onChange={(e) => setMaxIn(e.target.value)} className={input} />
          {err("maxInputTokens")}
        </label>
        <label>
          <span className="mb-1 block font-medium">Max reply tokens</span>
          <input inputMode="numeric" value={maxOut} onChange={(e) => setMaxOut(e.target.value)} className={input} />
          {err("maxOutputTokens")}
        </label>
      </div>
      <label className="block">
        <span className="mb-1 block font-medium">Personal data in prompts</span>
        <select value={pii} onChange={(e) => setPii(e.target.value as Policy["pii"])} className={input}>
          <option value="redact">{piiText.redact}</option>
          <option value="block">{piiText.block}</option>
          <option value="allow">{piiText.allow}</option>
        </select>
      </label>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={injection} onChange={(e) => setInjection(e.target.checked)} className="accent-teal-700" />
        <span>Refuse prompt-injection attempts</span>
      </label>
      <label className="block">
        <span className="mb-1 block font-medium">Blocked terms</span>
        <textarea rows={3} value={terms} onChange={(e) => setTerms(e.target.value)} placeholder="One per line" className={input} />
        {Object.keys(errors).find((k) => k.startsWith("blockedTerms")) && <p className="mt-1 text-xs text-rose-700">Each term must be 1–100 characters.</p>}
      </label>
      {update.error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-800">{update.error.message}</p>}
      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onDone} className="rounded-lg px-3 py-1.5 font-medium text-stone-600 hover:bg-stone-100">
          Cancel
        </button>
        <button disabled={update.isPending} className="rounded-lg bg-ink px-3.5 py-1.5 font-medium text-white hover:bg-stone-800 disabled:opacity-50">
          {update.isPending ? "Saving…" : "Save policy"}
        </button>
      </div>
    </form>
  );
}
