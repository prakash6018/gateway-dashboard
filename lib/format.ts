// Display helpers. LLM costs are often fractions of a cent, so small amounts
// keep more decimals instead of rounding to $0.00.
export function usd(x: number): string {
  if (!Number.isFinite(x)) return "—";
  if (x === 0) return "$0.00";
  const abs = Math.abs(x);
  const digits = abs < 0.01 ? 4 : abs < 1 ? 3 : 2;
  return (x < 0 ? "-$" : "$") + abs.toFixed(digits);
}

export const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

export function compact(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return (n / 1000).toFixed(n < 10_000 ? 1 : 0).replace(/\.0$/, "") + "k";
  return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
}

export function relativeTime(iso: string, now = Date.now()): string {
  const s = Math.round((now - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86_400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 7 * 86_400) return `${Math.floor(s / 86_400)}d ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export const shortDay = (day: string) =>
  new Date(day + "T00:00:00Z").toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });

/** Budget state used for colours and labels. */
export function budgetLevel(spent: number, budget: number): "ok" | "warn" | "over" {
  if (budget <= 0) return spent > 0 ? "over" : "ok";
  const r = spent / budget;
  return r >= 0.95 ? "over" : r >= 0.75 ? "warn" : "ok";
}

/** "Nice" axis ticks: 0 and up to `count` round steps covering max. */
export function niceTicks(max: number, count = 3): number[] {
  if (max <= 0) return [0];
  const raw = max / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw)!;
  return Array.from({ length: Math.ceil(max / step) + 1 }, (_, i) => +(i * step).toPrecision(6));
}
