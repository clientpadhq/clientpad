import { redirect } from "next/navigation";
import { SidebarNav, BottomNav } from "@/components/layout/nav";
import { TopBar } from "@/components/layout/top-bar";
import { requireUser } from "@/lib/auth/session";
import { acceptPendingInvites, getWorkspaceForUser } from "@/lib/db/workspace";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  await acceptPendingInvites(user.id, user.email);
import { getWorkspaceForUser } from "@/lib/db/workspace";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const workspaceData = await getWorkspaceForUser(user.id);

  if (!workspaceData) {
    redirect("/onboarding");
  }

  return (
    <div className="min-h-screen md:flex">
      <SidebarNav />
      <div className="flex min-h-screen flex-1 flex-col pb-14 md:pb-0">
        <TopBar workspaceName={workspaceData.workspace.name} />
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
      <BottomNav />
    </div>
  );
}
