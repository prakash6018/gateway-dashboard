import { permissionsForPatch } from "@/lib/rbac.ts";
import { tenantPatchSchema } from "@/lib/schemas.ts";
import { authorize, errorJson, gateway, safeId } from "@/lib/server.ts";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: Ctx) {
  const auth = await authorize(req, "tenants:view");
  if (auth instanceof Response) return auth;
  const { id } = await ctx.params;
  if (!safeId(id)) return errorJson(400, "bad_request", "Invalid tenant id.");
  const days = new URL(req.url).searchParams.get("days") ?? "30";
  return gateway(`/admin/tenants/${id}?days=${encodeURIComponent(days)}`);
}

export async function PATCH(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  if (!safeId(id)) return errorJson(400, "bad_request", "Invalid tenant id.");
  const raw = await req.json().catch(() => null);
  const parsed = tenantPatchSchema.safeParse(raw);
  if (!parsed.success) return errorJson(400, "invalid", parsed.error.issues[0]?.message ?? "Invalid update.");
  // Which permission is needed depends on what the request changes.
  const auth = await authorize(req, "tenants:view", ...permissionsForPatch(parsed.data));
  if (auth instanceof Response) return auth;
  return gateway(`/admin/tenants/${id}`, { method: "PATCH", body: parsed.data });
}
