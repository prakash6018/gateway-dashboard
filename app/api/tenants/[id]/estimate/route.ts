import { estimateInputSchema, toGatewayRequest } from "@/lib/schemas.ts";
import { authorize, errorJson, gateway, safeId } from "@/lib/server.ts";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await authorize(req, "estimate:run");
  if (auth instanceof Response) return auth;
  const { id } = await ctx.params;
  if (!safeId(id)) return errorJson(400, "bad_request", "Invalid tenant id.");
  const parsed = estimateInputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return errorJson(400, "invalid", parsed.error.issues[0]?.message ?? "Invalid input.");
  return gateway(`/admin/tenants/${id}/estimate`, { method: "POST", body: toGatewayRequest(parsed.data) });
}
