// Demo sign-in: choose a role. In production, replace this with an OIDC
// callback (Auth0, Microsoft Entra ID) that maps the user's group to a role
// and then calls signSession the same way.
import { signSession, SESSION_COOKIE, SESSION_TTL_MS, type Role } from "@/lib/session.ts";
import { sessionSecret } from "@/lib/server.ts";

export async function POST(req: Request) {
  if (process.env.DEMO_LOGIN !== "on") return new Response("Demo sign-in is off.", { status: 404 });
  const form = await req.formData();
  const role = form.get("role");
  if (role !== "admin" && role !== "viewer") return new Response("Unknown role.", { status: 400 });
  const token = await signSession(
    { sub: `${role}@demo`, name: role === "admin" ? "Asha (Admin)" : "Ravi (Viewer)", role: role as Role, exp: Date.now() + SESSION_TTL_MS },
    sessionSecret(),
  );
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return new Response(null, {
    status: 303,
    headers: {
      location: "/",
      "set-cookie": `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_TTL_MS / 1000}${secure}`,
    },
  });
}
