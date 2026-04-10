import { redirect } from "next/navigation";
import { SidebarNav, BottomNav } from "@/components/layout/nav";
import { TopBar } from "@/components/layout/top-bar";
import { requireUser } from "@/lib/auth/session";
import {
  ensureWorkspaceOnboardingState,
  getWorkspaceForUser,
  getWorkspaceOnboardingState,
  getWorkspacesForUser,
  isWorkspaceOnboardingRequired,
} from "@/lib/db/workspace";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const [workspaceData, memberships] = await Promise.all([
    getWorkspaceForUser(user.id),
    getWorkspacesForUser(user.id),
  ]);

  if (!workspaceData) {
    redirect("/onboarding");
  }

  if (workspaceData.role === "owner" || workspaceData.role === "admin") {
    await ensureWorkspaceOnboardingState(workspaceData.workspace.id);
  }

  const onboardingState = await getWorkspaceOnboardingState(workspaceData.workspace.id);
  if (isWorkspaceOnboardingRequired(workspaceData.role, onboardingState)) {
    redirect("/onboarding");
  }

  return (
    <div className="min-h-screen md:flex">
      <SidebarNav />
      <div className="flex min-h-screen flex-1 flex-col pb-14 md:pb-0">
        <TopBar
          workspaceName={workspaceData.workspace.name}
          activeWorkspaceId={workspaceData.workspace.id}
          workspaces={memberships.map((membership) => ({
            id: membership.workspace.id,
            name: membership.workspace.name,
            role: membership.role,
          }))}
        />
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
      <BottomNav />
    </div>
  );
}
