import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { updateWorkspaceAction } from "@/lib/actions/workspace";
import { updatePaymentSettingsAction } from "@/lib/actions/revenue";
import { getWorkspaceMembers } from "@/lib/db/workspace";
import { getPaymentSettings } from "@/lib/db/revenue";
import { canManageSettings, requireWorkspace } from "@/lib/rbac/permissions";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const context = await requireWorkspace();
  const params = await searchParams;
  const [members, paymentSettings] = await Promise.all([
    getWorkspaceMembers(context.workspace.id),
    getPaymentSettings(context.workspace.id),
  ]);

  return (
    <div className="space-y-4">
      <PageHeader title="Settings" description="Workspace profile, team and payments config." />

      {params.error ? <p className="rounded bg-red-50 p-2 text-sm text-red-700">{params.error}</p> : null}
      {params.success ? <p className="rounded bg-green-50 p-2 text-sm text-green-700">{params.success}</p> : null}

      <Card title="Workspace Profile">
        {canManageSettings(context.role) ? (
          <form action={updateWorkspaceAction} className="space-y-3">
            <input name="name" defaultValue={context.workspace.name} required />
            <input name="phone" defaultValue={context.workspace.phone ?? ""} />
            <input name="business_type" defaultValue={context.workspace.business_type ?? ""} />
            <div className="rounded border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
              Default currency: <span className="font-medium">NGN</span>
            </div>
            <button className="w-full bg-emerald-600 text-white">Save changes</button>
          </form>
        ) : (
          <p className="text-sm text-slate-600">Only owners/admins can edit workspace settings.</p>
        )}
      </Card>

      <Card title="Payment Configuration (Flutterwave)">
        {canManageSettings(context.role) ? (
          <form action={updatePaymentSettingsAction} className="space-y-3">
            <input
              name="flutterwave_public_key"
              defaultValue={paymentSettings?.flutterwave_public_key ?? ""}
              placeholder="Flutterwave public key (optional)"
            />
            <input
              name="flutterwave_webhook_hash"
              defaultValue={paymentSettings?.flutterwave_webhook_hash ?? ""}
              placeholder="Workspace webhook hash (optional)"
            />
            <textarea
              name="bank_instruction"
              defaultValue={paymentSettings?.bank_instruction ?? ""}
              placeholder="Payment instructions shown on invoice PDF"
              rows={3}
            />
            <button className="w-full bg-slate-800 text-white">Save payment settings</button>
          </form>
        ) : (
          <p className="text-sm text-slate-600">Only owners/admins can edit payment settings.</p>
        )}
      </Card>

      <Card title="Team Members">
        {members.length === 0 ? (
          <p className="text-sm text-slate-600">No members available.</p>
        ) : (
          <ul className="space-y-2">
            {members.map((member) => (
              <li key={member.user_id} className="rounded border border-slate-200 p-3 text-sm">
                <p className="font-medium text-slate-900">{member.profiles?.full_name ?? member.user_id}</p>
                <p className="text-slate-600">Role: {member.role}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
