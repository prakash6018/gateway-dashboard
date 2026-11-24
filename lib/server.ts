// Server-only helpers for API routes: who is calling, are they allowed, and a
// proxy to the gateway's admin API. The admin token stays on the server.
import { can, type Permission } from "./rbac.ts";
import { SESSION_COOKIE, verifySession, type Session } from "./session.ts";

export function readCookie(header: string | null, name: string): string | undefined {
  for (const part of header?.split(";") ?? []) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return undefined;
}

export const sessionSecret = () => process.env.SESSION_SECRET ?? "";

export async function sessionFrom(req: Request): Promise<Session | null> {
  return verifySession(readCookie(req.headers.get("cookie"), SESSION_COOKIE), sessionSecret());
}

export const errorJson = (status: number, code: string, message: string) =>
  Response.json({ error: { code, message } }, { status });

/** Returns the session, or a 401/403 Response to send back. */
export async function authorize(req: Request, ...needed: Permission[]): Promise<Session | Response> {
  const s = await sessionFrom(req);
  if (!s) return errorJson(401, "unauthenticated", "Sign in again.");
  const missing = needed.filter((p) => !can(s.role, p));
  if (missing.length) return errorJson(403, "forbidden", `Your role (${s.role}) can't do this: ${missing.join(", ")}.`);
  return s;
}

/** Calls the gateway admin API and relays its JSON and status. */
export async function gateway(path: string, init: { method?: string; body?: unknown } = {}): Promise<Response> {
  const base = process.env.GATEWAY_URL;
  const token = process.env.GATEWAY_ADMIN_TOKEN;
  if (!base || !token) return errorJson(500, "misconfigured", "GATEWAY_URL and GATEWAY_ADMIN_TOKEN must be set.");
  try {
    const res = await fetch(base.replace(/\/$/, "") + path, {
      method: init.method ?? "GET",
      headers: { "x-admin-token": token, "content-type": "application/json" },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    const body = await res.json().catch(() => ({ error: { code: "bad_gateway", message: "Gateway sent an invalid response." } }));
    return Response.json(body, { status: res.status });
  } catch {
    return errorJson(502, "gateway_unreachable", "Can't reach the gateway. Is it running?");
  }
}

export const safeId = (id: string) => /^[A-Za-z0-9_-]{1,64}$/.test(id);
