import { authorize, gateway } from "@/lib/server.ts";

export async function GET(req: Request) {
  const auth = await authorize(req, "tenants:view");
  if (auth instanceof Response) return auth;
  return gateway("/admin/tenants");
}
