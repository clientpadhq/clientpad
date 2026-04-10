import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/revenue/status-badge";
import { requireWorkspace } from "@/lib/rbac/permissions";
import { listJobs } from "@/lib/db/execution";

export default async function JobsPage() {
  const { workspace } = await requireWorkspace();
  const jobs = await listJobs(workspace.id);

  return (
    <div className="space-y-4">
      <PageHeader title="Jobs" description="Track post-sale execution." action={<Link className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white" href="/jobs/new">New job</Link>} />
      {jobs.length === 0 ? <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">No jobs yet.</div> : (
        <ul className="space-y-2">{jobs.map((job) => <li key={job.id} className="rounded-lg border border-slate-200 bg-white p-4"><div className="flex items-center justify-between"><Link href={`/jobs/${job.id}`} className="font-medium">{job.title}</Link><StatusBadge status={job.status} /></div><p className="text-sm text-slate-600">{job.client?.business_name ?? "No client"} • Priority: {job.priority}</p></li>)}</ul>
      )}
    </div>
  );
}
