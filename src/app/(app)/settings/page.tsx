import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import {
  inviteMemberAction,
  revokeInviteAction,
  transferOwnershipAction,
  updateBrandingSettingsAction,
  updateMemberRoleAction,
  updateWorkspaceAction,
} from "@/lib/actions/workspace";
import { updatePaymentSettingsAction } from "@/lib/actions/revenue";
import { updateAISettingsAction } from "@/lib/actions/ai";
import { getWorkspaceBrandingSettings, getWorkspaceInvites, getWorkspaceMembers } from "@/lib/db/workspace";
import { getPaymentSettings } from "@/lib/db/revenue";
import { getWorkspaceAISettings, listAIGenerations } from "@/lib/db/ai";
import { canManageSettings, requireWorkspace } from "@/lib/rbac/permissions";

function getAssignableRoles(role: "owner" | "admin" | "staff") {
  return role === "owner" ? ["owner", "admin", "staff"] : ["admin", "staff"];
}

function memberFullName(member: { user_id: string; profiles?: { full_name: string | null } | Array<{ full_name: string | null }> | null }) {
  if (!member.profiles) return member.user_id;
  return Array.isArray(member.profiles)
    ? (member.profiles[0]?.full_name ?? member.user_id)
    : (member.profiles.full_name ?? member.user_id);
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const context = await requireWorkspace();
  const params = await searchParams;

  const [members, invites, paymentSettings, brandingSettings, aiSettings, aiRows] = await Promise.all([
    getWorkspaceMembers(context.workspace.id),
    getWorkspaceInvites(context.workspace.id),
    getPaymentSettings(context.workspace.id),
    getWorkspaceBrandingSettings(context.workspace.id),
    getWorkspaceAISettings(context.workspace.id),
    listAIGenerations(context.workspace.id),
  ]);

  const transferCandidates = members.filter((member) => member.user_id !== context.user.id);
  const monthlyUsage = aiRows.filter((row) => row.created_at.startsWith(new Date().toISOString().slice(0, 7))).length;
  const monthlyCap = aiSettings?.monthly_cap ?? null;
  const capReached = monthlyCap !== null && monthlyUsage >= monthlyCap;

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
                {assignableRoles.map((allowedRole) => <option key={allowedRole} value={allowedRole}>{allowedRole}</option>)}
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
                        <p className="font-medium text-slate-900">{memberFullName(member)}</p>
                        <p className="text-xs text-slate-500">{member.user_id}</p>
                      </div>
                      <form action={updateMemberRoleAction} className="flex items-center gap-2">
                        <input type="hidden" name="member_user_id" value={member.user_id} />
                        <select name="role" defaultValue={member.role}>
                          {assignableRoles.map((allowedRole) => <option key={allowedRole} value={allowedRole}>{allowedRole}</option>)}
                        </select>
                        <button className="border border-slate-300">Update role</button>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {context.role === "owner" ? (
              <div className="space-y-2 rounded border border-amber-200 bg-amber-50 p-3">
                <p className="text-sm font-semibold text-amber-900">Transfer ownership</p>
                <p className="text-xs text-amber-800">
                  Ownership transfer must be initiated by the current owner and will demote your role to admin.
                </p>
                <form action={transferOwnershipAction} className="flex flex-col gap-2 md:flex-row">
                  <select name="new_owner_user_id" required defaultValue="">
                    <option value="" disabled>
                      Select new owner
                    </option>
                    {transferCandidates.map((member) => (
                      <option key={member.user_id} value={member.user_id}>
                        {memberFullName(member) + ` (${member.role})`}
                      </option>
                    ))}
                  </select>
                  <button className="border border-amber-300 bg-white">Transfer ownership</button>
                </form>
              </div>
            ) : null}

            <div>
              <p className="mb-2 text-sm font-semibold">Invites</p>
              {invites.length === 0 ? (
                <p className="text-sm text-slate-600">No invites yet.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {invites.map((invite) => (
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

      <Card title="Branding & Document Defaults">
        {canManageSettings(context.role) ? (
          <form action={updateBrandingSettingsAction} className="space-y-3">
            <input name="email" defaultValue={brandingSettings?.email ?? ""} placeholder="Public email for documents" />
            <textarea name="address" defaultValue={brandingSettings?.address ?? ""} placeholder="Business address" rows={2} />
            <input
              name="website_or_social"
              defaultValue={brandingSettings?.website_or_social ?? ""}
              placeholder="Website or social handle"
            />
            <input name="logo_url" defaultValue={brandingSettings?.logo_url ?? ""} placeholder="Logo URL (PNG/JPG)" />
            <textarea
              name="default_footer_text"
              defaultValue={brandingSettings?.default_footer_text ?? ""}
              placeholder="Default footer text for PDFs"
              rows={2}
            />
            <textarea
              name="default_quote_terms"
              defaultValue={brandingSettings?.default_quote_terms ?? ""}
              placeholder="Default quote terms (used when quote terms are empty)"
              rows={3}
            />
            <textarea
              name="default_invoice_terms"
              defaultValue={brandingSettings?.default_invoice_terms ?? ""}
              placeholder="Default invoice terms (used when invoice instructions are empty)"
              rows={3}
            />
            <button className="w-full bg-indigo-700 text-white">Save branding defaults</button>
          </form>
        ) : (
          <p className="text-sm text-slate-600">Only owners/admins can edit branding settings.</p>
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
          Monthly usage: <span className="font-semibold">{monthlyUsage}</span>
          {monthlyCap ? (
            <>
              {" "}/ <span className="font-semibold">{monthlyCap}</span>
            </>
          ) : (
            <span> / unlimited</span>
          )}
          {capReached ? <p className="mt-2 text-amber-700">Monthly cap reached. New generations are blocked and recorded as unavailable.</p> : null}
        </div>

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
