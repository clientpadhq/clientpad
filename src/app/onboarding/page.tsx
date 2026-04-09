import { redirect } from "next/navigation";
import { createWorkspaceAction } from "@/lib/actions/workspace";
import { requireUser } from "@/lib/auth/session";
import { getWorkspaceForUser } from "@/lib/db/workspace";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await requireUser();
  const workspaceData = await getWorkspaceForUser(user.id);

  if (workspaceData) {
    redirect("/dashboard");
  }

  const params = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg items-center px-4 py-10">
      <div className="w-full rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Set up your workspace</h1>
        <p className="mt-1 text-sm text-slate-600">Create your first workspace to start using ClientPad.</p>

        {params.error ? <p className="mt-4 rounded bg-red-50 p-2 text-sm text-red-700">{params.error}</p> : null}

        <form action={createWorkspaceAction} className="mt-6 space-y-3">
          <input name="name" placeholder="Business name" required />
          <input name="phone" placeholder="Business phone" />
          <input name="business_type" placeholder="Business type (e.g., Solar installer)" />
          <div className="rounded border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
            Default currency: <span className="font-medium">NGN</span>
          </div>
          <button className="w-full bg-emerald-600 text-white">Create workspace</button>
        </form>
      </div>
    </main>
  );
}
