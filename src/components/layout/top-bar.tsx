import { signOutAction } from "@/lib/actions/auth";

export function TopBar({ workspaceName }: { workspaceName: string }) {
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
      <div>
        <p className="text-xs text-slate-500">Workspace</p>
        <p className="text-sm font-semibold text-slate-900">{workspaceName}</p>
      </div>
      <form action={signOutAction}>
        <button className="border border-slate-300 text-slate-700">Sign out</button>
      </form>
    </header>
  );
}
