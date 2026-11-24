// Request validation shared by the browser (forms) and the server (API routes).
import { z } from "zod";

export const policySchema = z
  .object({
    allowedModels: z.array(z.string().min(1)).min(1, "Allow at least one model"),
    maxInputTokens: z.number().int().min(1).max(1_000_000),
    maxOutputTokens: z.number().int().min(1).max(1_000_000),
    pii: z.enum(["redact", "block", "allow"]),
    blockInjection: z.boolean(),
    blockedTerms: z.array(z.string().trim().min(1).max(100)).max(100).default([]),
  })
  .strict();

export type Policy = z.infer<typeof policySchema>;

export const tenantPatchSchema = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
    monthlyBudgetUsd: z.number().min(0).max(1_000_000).optional(),
    policy: policySchema.optional(),
  })
  .strict()
  .refine((p) => p.name !== undefined || p.monthlyBudgetUsd !== undefined || p.policy !== undefined, "Nothing to update");

export type TenantPatch = z.infer<typeof tenantPatchSchema>;

export const estimateInputSchema = z
  .object({
    model: z.string().min(1),
    system: z.string().max(20_000).optional(),
    prompt: z.string().min(1, "Write a prompt").max(100_000),
    maxTokens: z.number().int().min(1).max(100_000),
  })
  .strict();

export type EstimateInput = z.infer<typeof estimateInputSchema>;

/** Gateway request body for an estimate. */
export function toGatewayRequest(e: EstimateInput) {
  return {
    model: e.model,
    max_tokens: e.maxTokens,
    messages: [...(e.system?.trim() ? [{ role: "system", content: e.system }] : []), { role: "user", content: e.prompt }],
  };
}

/** Blocked terms are edited as one term per line. */
export const parseTerms = (text: string) =>
  [...new Set(text.split("\n").map((t) => t.trim()).filter(Boolean))];

/** First error message per field, for showing next to inputs. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    out[key] ??= issue.message;
  }
  return out;
}
