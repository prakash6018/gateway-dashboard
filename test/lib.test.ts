import { test } from "node:test";
import assert from "node:assert/strict";
import { signSession, verifySession, SESSION_COOKIE } from "../lib/session.ts";
import { can, permissionsForPatch } from "../lib/rbac.ts";
import { policySchema, tenantPatchSchema, toGatewayRequest, parseTerms, estimateInputSchema } from "../lib/schemas.ts";
import { usd, niceTicks, budgetLevel, compact, relativeTime } from "../lib/format.ts";
import { authorize, readCookie } from "../lib/server.ts";

const SECRET = "test-secret-at-least-16-chars";
const session = { sub: "a@demo", name: "A", role: "admin" as const, exp: Date.now() + 60_000 };

test("session round-trip", async () => {
  const token = await signSession(session, SECRET);
  assert.deepEqual(await verifySession(token, SECRET), session);
});

test("tampered, expired, wrong-secret and malformed tokens are rejected", async () => {
  const token = await signSession(session, SECRET);
  const [body, sig] = token.split(".");
  const forged = Buffer.from(JSON.stringify({ ...session, role: "admin", sub: "x" })).toString("base64url");
  assert.equal(await verifySession(`${forged}.${sig}`, SECRET), null);
  assert.equal(await verifySession(`${body}.${sig}x`, SECRET), null);
  assert.equal(await verifySession(token, "another-secret-of-16+"), null);
  assert.equal(await verifySession(await signSession({ ...session, exp: Date.now() - 1 }, SECRET), SECRET), null);
  assert.equal(await verifySession("garbage", SECRET), null);
  assert.equal(await verifySession(undefined, SECRET), null);
});

test("viewer upgrading itself to admin fails the signature", async () => {
  const token = await signSession({ ...session, role: "viewer" }, SECRET);
  const [body, sig] = token.split(".");
  const payload = JSON.parse(Buffer.from(body, "base64url").toString());
  const edited = Buffer.from(JSON.stringify({ ...payload, role: "admin" })).toString("base64url");
  assert.equal(await verifySession(`${edited}.${sig}`, SECRET), null);
});

test("short secrets are refused", async () => {
  await assert.rejects(signSession(session, "short"));
});

test("rbac", () => {
  assert.equal(can("admin", "policy:edit"), true);
  assert.equal(can("viewer", "policy:edit"), false);
  assert.equal(can("viewer", "estimate:run"), true);
  assert.equal(can(undefined, "tenants:view"), false);
  assert.deepEqual(permissionsForPatch({ monthlyBudgetUsd: 1 }), ["budget:edit"]);
  assert.deepEqual(permissionsForPatch({ policy: {} , monthlyBudgetUsd: 1 }).sort(), ["budget:edit", "policy:edit"]);
});

const policy = { allowedModels: ["m"], maxInputTokens: 10, maxOutputTokens: 10, pii: "redact", blockInjection: true, blockedTerms: [" x "] };

test("schemas", () => {
  assert.deepEqual(policySchema.parse(policy).blockedTerms, ["x"]);
  assert.equal(policySchema.safeParse({ ...policy, allowedModels: [] }).success, false);
  assert.equal(policySchema.safeParse({ ...policy, extra: 1 }).success, false);
  assert.equal(tenantPatchSchema.safeParse({}).success, false);
  assert.equal(tenantPatchSchema.safeParse({ monthlyBudgetUsd: -1 }).success, false);
  assert.equal(tenantPatchSchema.safeParse({ monthlyBudgetUsd: 2 }).success, true);
  assert.deepEqual(parseTerms("a\n\n b \na"), ["a", "b"]);
  const e = estimateInputSchema.parse({ model: "m", system: " ", prompt: "hi", maxTokens: 5 });
  assert.deepEqual(toGatewayRequest(e), { model: "m", max_tokens: 5, messages: [{ role: "user", content: "hi" }] });
});

test("format", () => {
  assert.equal(usd(0), "$0.00");
  assert.equal(usd(0.00042), "$0.0004");
  assert.equal(usd(0.305), "$0.305");
  assert.equal(usd(12.5), "$12.50");
  assert.equal(compact(1234), "1.2k");
  assert.equal(budgetLevel(0.8, 1), "warn");
  assert.equal(budgetLevel(0.99, 1), "over");
  assert.deepEqual(niceTicks(0.023, 3), [0, 0.01, 0.02, 0.03]);
  assert.equal(relativeTime(new Date(Date.now() - 5 * 60_000).toISOString()), "5m ago");
});

test("authorize: 401 without a session, 403 for the wrong role, session otherwise", async () => {
  process.env.SESSION_SECRET = SECRET;
  const req = (token?: string) => new Request("http://x/api", { headers: token ? { cookie: `a=b; ${SESSION_COOKIE}=${token}` } : {} });
  assert.equal(((await authorize(req(), "tenants:view")) as Response).status, 401);
  const viewer = await signSession({ ...session, role: "viewer" }, SECRET);
  assert.equal(((await authorize(req(viewer), "policy:edit")) as Response).status, 403);
  const ok = await authorize(req(viewer), "tenants:view");
  assert.equal((ok as { role: string }).role, "viewer");
  assert.equal(readCookie("a=1; b=x%3Dy", "b"), "x=y");
});
