"use client";
// Typed client for the dashboard's own API routes, with TanStack Query hooks.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { EstimateInput, Policy, TenantPatch } from "./schemas.ts";

export interface TenantSummary {
  id: string;
  name: string;
  monthlyBudgetUsd: number;
  spentUsd: number;
  policy: Policy;
  requests: number;
  blocked: number;
  piiRedactions: number;
}

export interface DailyPoint {
  day: string;
  requests: number;
  blocked: number;
  costUsd: number;
}

export type Outcome = "ok" | "blocked" | "budget" | "error";

export interface GatewayEvent {
  id: string;
  at: string;
  model: string;
  outcome: Outcome;
  code: string | null;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  findings: string[];
}

export interface ModelUsage {
  model: string;
  requests: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

export interface TenantDetail {
  tenant: TenantSummary;
  daily: DailyPoint[];
  byModel: ModelUsage[];
  events: GatewayEvent[];
  keys: { provider: string; hint: string; createdAt: string }[];
  models: string[];
}

export interface EstimateResult {
  estimate: { model: string; inputTokens: number; maxOutputTokens: number; worstCaseUsd: number; likelyUsd: number };
  budget: { monthlyUsd: number; committedUsd: number; remainingUsd: number; fits: boolean };
  findings: { rule: string; detail: string }[];
  redacted: { role: string; content: string }[];
}

export class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function api<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const res = await fetch(path, {
    method: init?.method ?? "GET",
    headers: init?.body === undefined ? undefined : { "content-type": "application/json" },
    body: init?.body === undefined ? undefined : JSON.stringify(init.body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && typeof window !== "undefined") window.location.href = "/login";
    throw new ApiError(res.status, data?.error?.code ?? "error", data?.error?.message ?? `Request failed (${res.status})`);
  }
  return data as T;
}

export const keys = {
  tenants: ["tenants"] as const,
  tenant: (id: string, days: number) => ["tenant", id, days] as const,
};

export function useTenants() {
  return useQuery({
    queryKey: keys.tenants,
    queryFn: () => api<{ tenants: TenantSummary[]; models: string[] }>("/api/tenants"),
    refetchInterval: 30_000,
  });
}

export function useTenant(id: string, days: number) {
  return useQuery({
    queryKey: keys.tenant(id, days),
    queryFn: () => api<TenantDetail>(`/api/tenants/${encodeURIComponent(id)}?days=${days}`),
    refetchInterval: 30_000,
  });
}

export function useUpdateTenant(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: TenantPatch) => api<{ tenant: TenantSummary }>(`/api/tenants/${encodeURIComponent(id)}`, { method: "PATCH", body: patch }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.tenants });
      qc.invalidateQueries({ queryKey: ["tenant", id] });
    },
  });
}

export function useEstimate(id: string) {
  return useMutation({
    mutationFn: (input: EstimateInput) => api<EstimateResult>(`/api/tenants/${encodeURIComponent(id)}/estimate`, { method: "POST", body: input }),
  });
}
