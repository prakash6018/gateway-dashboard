import { SESSION_COOKIE } from "@/lib/session.ts";

export async function POST() {
  return new Response(null, {
    status: 303,
    headers: { location: "/login", "set-cookie": `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0` },
  });
}
