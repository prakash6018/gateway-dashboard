// Role-based access control. The server checks these on every API route;
// the UI uses the same table only to hide controls the user can't use.
import type { Role } from "./session.ts";

export type Permission = "tenants:view" | "estimate:run" | "budget:edit" | "policy:edit";

const GRANTS: Record<Role, readonly Permission[]> = {
  admin: ["tenants:view", "estimate:run", "budget:edit", "policy:edit"],
  viewer: ["tenants:view", "estimate:run"],
};

export function can(role: Role | undefined, permission: Permission): boolean {
  return !!role && GRANTS[role].includes(permission);
}

/** Permissions needed to apply a tenant patch, based on which fields it touches. */
export function permissionsForPatch(patch: { name?: unknown; monthlyBudgetUsd?: unknown; policy?: unknown }): Permission[] {
  const needed = new Set<Permission>();
  if (patch.monthlyBudgetUsd !== undefined || patch.name !== undefined) needed.add("budget:edit");
  if (patch.policy !== undefined) needed.add("policy:edit");
  return [...needed];
}
