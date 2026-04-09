import { ClientForm } from "@/components/forms/client-form";
import { PageHeader } from "@/components/ui/page-header";
import { createClientAction } from "@/lib/actions/clients";

export default function NewClientPage() {
  return (
    <div className="space-y-4">
      <PageHeader title="New Client" description="Add a new client profile." />
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <ClientForm action={createClientAction} />
      </div>
    </div>
  );
}
