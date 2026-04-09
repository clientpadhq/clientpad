import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { updateWorkspaceAction, inviteMemberAction, updateMemberRoleAction, revokeInviteAction } from "@/lib/actions/workspace";
import { updatePaymentSettingsAction } from "@/lib/actions/revenue";
import { updateAISettingsAction } from "@/lib/actions/ai";
import { getWorkspaceMembers, getWorkspaceInvites } from "@/lib/db/workspace";
import { getPaymentSettings } from "@/lib/db/revenue";
import { getWorkspaceAISettings, listAIGenerations } from "@/lib/db/ai";
import { canManageSettings, requireWorkspace } from "@/lib/rbac/permissions";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const context = await requireWorkspace();
  const params = await searchParams;

  const [members, invites, paymentSettings, aiSettings, aiRows] = await Promise.all([
    getWorkspaceMembers(context.workspace.id),
    getWorkspaceInvites(context.workspace.id),
    getPaymentSettings(context.workspace.id),
    getWorkspaceAISettings(context.workspace.id),
    listAIGenerations(context.workspace.id),
  ]);

  return (
    <div className="space-y-4">
      <PageHeader title="Settings" description="Workspace profile, team, payments, and AI controls." />

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

      <Card title="Team Management">
        {canManageSettings(context.role) ? (
          <div className="space-y-4">
            <form action={inviteMemberAction} className="grid gap-2 md:grid-cols-3">
              <input name="email" type="email" placeholder="Invite email" required />
              <select name="role" defaultValue="staff">
                <option value="owner">owner</option>
                <option value="admin">admin</option>
                <option value="staff">staff</option>
              </select>
              <button className="bg-emerald-700 text-white">Invite member</button>
            </form>

            <div>
              <p className="mb-2 text-sm font-semibold">Current members</p>
              <ul className="space-y-2">
                {members.map((member) => (
                  <li key={member.user_id} className="rounded border border-slate-200 p-3 text-sm">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="font-medium text-slate-900">{member.profiles?.full_name ?? member.user_id}</p>
                        <p className="text-xs text-slate-500">{member.user_id}</p>
                      </div>
                      <form action={updateMemberRoleAction} className="flex items-center gap-2">
                        <input type="hidden" name="member_user_id" value={member.user_id} />
                        <select name="role" defaultValue={member.role}>
                          <option value="owner">owner</option>
                          <option value="admin">admin</option>
                          <option value="staff">staff</option>
                        </select>
                        <button className="border border-slate-300">Update role</button>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="mb-2 text-sm font-semibold">Invites</p>
              {invites.length === 0 ? (
                <p className="text-sm text-slate-600">No invites yet.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {invites.map((invite: any) => (
                    <li key={invite.id} className="rounded border border-slate-200 p-3">
                      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="font-medium">{invite.email}</p>
                          <p className="text-xs text-slate-500">
                            {invite.role} • {invite.status}
                          </p>
                        </div>
                        {invite.status === "pending" ? (
                          <form action={revokeInviteAction}>
                            <input type="hidden" name="invite_id" value={invite.id} />
                            <button className="border border-slate-300">Revoke</button>
                          </form>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-600">Only owners/admins can manage team members.</p>
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
            <textarea
              name="bank_instruction"
              defaultValue={paymentSettings?.bank_instruction ?? ""}
              placeholder="Payment instructions shown on invoice PDF"
              rows={3}
            />
            <p className="rounded border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
              Webhook verification uses the server environment variable <code>FLUTTERWAVE_WEBHOOK_HASH</code>.
            </p>
            <button className="w-full bg-slate-800 text-white">Save payment settings</button>
          </form>
        ) : (
          <p className="text-sm text-slate-600">Only owners/admins can edit payment settings.</p>
        )}
      </Card>

      <Card title="AI Controls">
        {canManageSettings(context.role) ? (
          <form action={updateAISettingsAction} className="space-y-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="ai_enabled" defaultChecked={aiSettings?.ai_enabled ?? true} className="h-4 w-4" />
              AI enabled
            </label>
            <input name="default_provider" defaultValue={aiSettings?.default_provider ?? process.env.AI_PROVIDER ?? "mistral"} placeholder="Default provider" />
            <input name="default_model" defaultValue={aiSettings?.default_model ?? process.env.MISTRAL_MODEL ?? "mistral-small-latest"} placeholder="Default model" />
            <input type="number" name="monthly_cap" defaultValue={aiSettings?.monthly_cap ?? ""} placeholder="Monthly generation cap (optional)" />
            <button className="w-full bg-emerald-700 text-white">Save AI settings</button>
          </form>
        ) : (
          <p className="text-sm text-slate-600">Only owners/admins can edit AI settings.</p>
        )}
        <div className="mt-3 rounded border border-slate-200 p-3 text-xs text-slate-600">
          AI is optional and review-only. Missing Mistral config produces graceful unavailable/error generation records.
        </div>
        <div className="mt-3 flex items-center justify-between text-sm">
          <span>Recent AI generations: {aiRows.length}</span>
          <Link href="/ai/history" className="text-emerald-700 underline">
            View AI history
          </Link>
        </div>
      </Card>
    </div>
  );
}
