// Signed session tokens using Web Crypto HMAC-SHA256, so the same code runs in
// Next.js middleware (edge runtime) and in route handlers (Node).
//
// Token format: base64url(JSON payload) + "." + base64url(signature)

export type Role = "admin" | "viewer";

export interface Session {
  sub: string;
  name: string;
  role: Role;
  /** Expiry, milliseconds since epoch. */
  exp: number;
}

export const SESSION_COOKIE = "gd_session";
export const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

const enc = new TextEncoder();
const dec = new TextDecoder();

function toB64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(s: string): Uint8Array {
  const b = atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4));
  return Uint8Array.from(b, (c) => c.charCodeAt(0));
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  if (!secret || secret.length < 16) throw new Error("SESSION_SECRET must be at least 16 characters");
  return crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

export async function signSession(session: Session, secret: string): Promise<string> {
  const body = toB64url(enc.encode(JSON.stringify(session)));
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", await hmacKey(secret), enc.encode(body)));
  return `${body}.${toB64url(sig)}`;
}

/** Returns the session if the signature is valid and it hasn't expired; otherwise null. */
export async function verifySession(token: string | undefined, secret: string, now = Date.now()): Promise<Session | null> {
  if (!token) return null;
  const [body, sig, extra] = token.split(".");
  if (!body || !sig || extra !== undefined) return null;
  try {
    // crypto.subtle.verify compares in constant time.
    const ok = await crypto.subtle.verify("HMAC", await hmacKey(secret), fromB64url(sig) as BufferSource, enc.encode(body));
    if (!ok) return null;
    const s = JSON.parse(dec.decode(fromB64url(body))) as Session;
    if (typeof s.exp !== "number" || s.exp <= now) return null;
    if (s.role !== "admin" && s.role !== "viewer") return null;
    return s;
  } catch {
    return null;
  }
}
