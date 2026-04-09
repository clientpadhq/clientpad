import { redirect } from "next/navigation";
import type { Role } from "@/types/database";
import { getWorkspaceForUser } from "@/lib/db/workspace";
import { requireUser } from "@/lib/auth/session";

const rank: Record<Role, number> = {
  owner: 3,
  admin: 2,
  staff: 1,
};

export async function requireWorkspace(minRole: Role = "staff") {
  const user = await requireUser();
  const workspaceData = await getWorkspaceForUser(user.id);

  if (!workspaceData) {
    redirect("/onboarding");
  }

  if (rank[workspaceData.role] < rank[minRole]) {
    throw new Error("Insufficient permissions for this action.");
  }

  return {
    user,
    workspace: workspaceData.workspace,
    role: workspaceData.role,
  };
}

export function canManageSettings(role: Role) {
  return role === "owner" || role === "admin";
}

export function canDeleteRecords(role: Role) {
  return role === "owner" || role === "admin";
}

export function canManageRevenue(role: Role) {
  return role === "owner" || role === "admin";
}

export function canAssignRole(actorRole: Role, targetRole: Role) {
  if (targetRole === "owner") return actorRole === "owner";
  return actorRole === "owner" || actorRole === "admin";
}

export function getAssignableRoles(actorRole: Role): Role[] {
  return actorRole === "owner" ? ["owner", "admin", "staff"] : ["admin", "staff"];
}
