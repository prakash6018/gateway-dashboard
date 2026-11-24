import type { GatewayEvent } from "@/lib/api.ts";
import { relativeTime, usd } from "@/lib/format.ts";
import { Badge } from "./ui";

const label: Record<GatewayEvent["outcome"], string> = { ok: "Allowed", blocked: "Refused", budget: "Over budget", error: "Provider error" };

const codeText: Record<string, string> = {
  policy_violation: "policy",
  budget_exceeded: "budget",
  provider_error: "provider",
  no_key: "no key",
};

export function EventsTable({ events }: { events: GatewayEvent[] }) {
  if (!events.length) return <p className="text-sm text-stone-500">No requests yet.</p>;
  return (
    <div className="-mx-5 -my-5 overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b border-stone-100 text-left text-xs text-stone-500">
          <tr>
            <th className="px-5 py-2.5 font-medium">When</th>
            <th className="px-3 py-2.5 font-medium">Model</th>
            <th className="px-3 py-2.5 font-medium">Outcome</th>
            <th className="px-3 py-2.5 text-right font-medium">Tokens in / out</th>
            <th className="px-3 py-2.5 text-right font-medium">Cost</th>
            <th className="px-5 py-2.5 font-medium">Guardrails</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {events.map((e) => (
            <tr key={e.id}>
              <td className="whitespace-nowrap px-5 py-2.5 text-stone-500" title={new Date(e.at).toLocaleString("en-IN")}>
                {relativeTime(e.at)}
              </td>
              <td className="px-3 py-2.5 font-mono text-xs">{e.model || "—"}</td>
              <td className="px-3 py-2.5">
                <Badge tone={e.outcome}>{label[e.outcome]}</Badge>
                {e.code && e.outcome !== "budget" && <span className="ml-1.5 text-xs text-stone-400">{codeText[e.code] ?? e.code}</span>}
              </td>
              <td className="px-3 py-2.5 text-right text-stone-600">{e.outcome === "ok" ? `${e.inputTokens} / ${e.outputTokens}` : "—"}</td>
              <td className="px-3 py-2.5 text-right">{e.outcome === "ok" ? usd(e.costUsd) : "—"}</td>
              <td className="px-5 py-2.5">
                <div className="flex flex-wrap gap-1">
                  {e.findings.map((f, i) => (
                    <Badge key={i} tone="accent">{f.replace(/^output\./, "reply: ").replace("pii.", "")}</Badge>
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
