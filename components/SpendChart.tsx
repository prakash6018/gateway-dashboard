"use client";
import { useState } from "react";
import type { DailyPoint } from "@/lib/api.ts";
import { niceTicks, shortDay, usd } from "@/lib/format.ts";

const W = 720;
const H = 220;
const PAD = { top: 12, right: 8, bottom: 26, left: 56 };

/** Daily spend as bars; refused requests as a rose tick under each day. */
export function SpendChart({ data }: { data: DailyPoint[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(...data.map((d) => d.costUsd), 0);
  const ticks = niceTicks(max, 3);
  const top = ticks[ticks.length - 1] || 1;
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const slot = innerW / data.length;
  const barW = Math.max(2, Math.min(18, slot * 0.68));
  const y = (v: number) => PAD.top + innerH - (v / top) * innerH;
  const labelEvery = Math.ceil(data.length / 6);
  const h = hover === null ? null : data[hover];

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`Daily spend for the last ${data.length} days`} onMouseLeave={() => setHover(null)}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} className="stroke-stone-100" />
            <text x={PAD.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-stone-400 text-[10px]">
              {usd(t)}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const cx = PAD.left + slot * i + slot / 2;
          const bh = Math.max(d.costUsd > 0 ? 1.5 : 0, innerH - (y(d.costUsd) - PAD.top));
          return (
            <g key={d.day} onMouseEnter={() => setHover(i)}>
              <rect x={PAD.left + slot * i} y={PAD.top} width={slot} height={innerH + 8} fill="transparent" />
              <rect x={cx - barW / 2} y={PAD.top + innerH - bh} width={barW} height={bh} rx={2} className={hover === i ? "fill-teal-800" : "fill-accent"} />
              {d.blocked > 0 && <rect x={cx - barW / 2} y={PAD.top + innerH + 3} width={barW} height={3} rx={1} className="fill-rose-400" opacity={Math.min(1, 0.35 + d.blocked / 20)} />}
              {i % labelEvery === 0 && (
                <text x={cx} y={H - 6} textAnchor="middle" className="fill-stone-400 text-[10px]">
                  {shortDay(d.day)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {h && (
        <div
          className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs shadow-md"
          style={{ left: `${((PAD.left + slot * hover! + slot / 2) / W) * 100}%` }}
        >
          <div className="font-medium">{shortDay(h.day)}</div>
          <div className="mt-0.5 text-stone-600">{usd(h.costUsd)} · {h.requests} requests</div>
          {h.blocked > 0 && <div className="text-rose-700">{h.blocked} refused</div>}
        </div>
      )}
      <div className="mt-2 flex gap-4 text-[11px] text-stone-500">
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-accent" />Spend</span>
        <span className="flex items-center gap-1.5"><span className="h-1 w-2 rounded-sm bg-rose-400" />Refused requests</span>
      </div>
    </div>
  );
}
