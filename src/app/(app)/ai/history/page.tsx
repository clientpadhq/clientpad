import { PageHeader } from "@/components/ui/page-header";
import { AIHistoryList } from "@/components/ai/ai-history-list";
import { requireWorkspace } from "@/lib/rbac/permissions";
import { listAIGenerations } from "@/lib/db/ai";

export default async function AIHistoryPage() {
  const { workspace } = await requireWorkspace("staff");
  const rows = await listAIGenerations(workspace.id);

  return (
    <div className="space-y-4">
      <PageHeader title="AI History" description="Audit trail for AI drafts and suggestions." />
      <AIHistoryList rows={rows} />
    </div>
  );
}
