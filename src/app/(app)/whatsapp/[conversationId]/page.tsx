import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import {
  createClientFromWhatsAppConversationAction,
  createLeadFromWhatsAppConversationAction,
  linkWhatsAppConversationAction,
  sendWhatsAppConversationReplyAction,
  updateWhatsAppConversationAction,
} from "@/lib/actions/whatsapp";
import { getWhatsAppConversation } from "@/lib/db/whatsapp";
import { getWorkspaceMembers } from "@/lib/db/workspace";
import { requireWorkspace } from "@/lib/rbac/permissions";
import { createClient } from "@/lib/supabase/server";

function memberName(member: { user_id: string; role: string; profiles: { full_name: string | null } | Array<{ full_name: string | null }> | null }) {
  if (!member.profiles) return member.user_id.slice(0, 8);
  return Array.isArray(member.profiles) ? (member.profiles[0]?.full_name ?? member.user_id.slice(0, 8)) : (member.profiles.full_name ?? member.user_id.slice(0, 8));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function recordHref(type: string | null, id: string | null) {
  if (!type || !id) return null;
  if (type === "lead") return `/leads/${id}`;
  if (type === "client") return `/clients/${id}`;
  if (type === "deal") return `/deals/${id}`;
  return null;
}

export default async function WhatsAppConversationPage({
  params,
  searchParams,
}: {
  params: Promise<{ conversationId: string }>;
  searchParams?: Promise<{ error?: string; sent?: string }>;
}) {
  const { workspace } = await requireWorkspace("staff");
  const { conversationId } = await params;
  const notices = await searchParams;
  const supabase = await createClient();

  let conversation;
  try {
    conversation = await getWhatsAppConversation(workspace.id, conversationId);
  } catch {
    notFound();
  }

  const members = await getWorkspaceMembers(workspace.id);
  const [leads, clients, deals] = await Promise.all([
    supabase.from("leads").select("id, name, phone").eq("workspace_id", workspace.id).order("created_at", { ascending: false }).limit(100),
    supabase.from("clients").select("id, business_name, phone").eq("workspace_id", workspace.id).order("created_at", { ascending: false }).limit(100),
    supabase.from("deals").select("id, title").eq("workspace_id", workspace.id).order("created_at", { ascending: false }).limit(100),
  ]);
  const linkedHref = recordHref(conversation.linked_entity_type, conversation.linked_entity_id);
  const displayName = conversation.display_name || conversation.remote_phone;
  const recentText = conversation.messages.slice(-6).map((message) => `${message.direction === "inbound" ? "Customer" : "Team"}: ${message.content}`).join("\n");

  return (
    <div className="space-y-4">
      <PageHeader
        title={displayName}
        description={`WhatsApp thread for ${conversation.remote_phone}`}
        action={<Link className="rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold" href="/whatsapp">Back to inbox</Link>}
      />

      {notices?.error ? <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{notices.error}</div> : null}
      {notices?.sent ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">Reply sent and saved to the thread.</div> : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="flex min-h-[620px] flex-col rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 p-4">
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-slate-100 px-2 py-1 capitalize text-slate-700">{conversation.status}</span>
              <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-700">Owner: {conversation.owner_name ?? "Unassigned"}</span>
              {conversation.unread_count > 0 ? <span className="rounded-full bg-emerald-600 px-2 py-1 font-bold text-white">{conversation.unread_count} unread</span> : null}
              {conversation.linked_entity_type ? <span className="rounded-full bg-blue-50 px-2 py-1 text-blue-800">Linked to {conversation.linked_entity_type}</span> : <span className="rounded-full bg-amber-50 px-2 py-1 text-amber-800">Unlinked</span>}
            </div>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4">
            {conversation.messages.length === 0 ? (
              <p className="text-sm text-slate-500">No messages in this thread yet.</p>
            ) : (
              conversation.messages.map((message) => (
                <div key={message.id} className={`flex ${message.direction === "outbound" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[82%] rounded-2xl px-4 py-2 shadow-sm ${message.direction === "outbound" ? "bg-emerald-600 text-white" : "bg-white text-slate-900"}`}>
                    <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                    <p className={`mt-1 text-[11px] ${message.direction === "outbound" ? "text-emerald-50" : "text-slate-500"}`}>
                      {formatTime(message.created_at)} · {message.direction} · {message.status}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          <form action={sendWhatsAppConversationReplyAction.bind(null, conversation.id)} className="space-y-2 border-t border-slate-200 p-4">
            <label className="text-sm font-semibold text-slate-700" htmlFor="message">Reply on WhatsApp</label>
            <textarea id="message" name="message" rows={3} placeholder="Type a clear, customer-ready WhatsApp reply..." required />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-slate-500">Uses the existing WhatsApp Business send infrastructure. No autonomous sending.</p>
              <button className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">Send reply</button>
            </div>
          </form>
        </section>

        <aside className="space-y-4">
          <section className="rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="font-semibold text-slate-950">Ownership & status</h2>
            <form action={updateWhatsAppConversationAction.bind(null, conversation.id)} className="mt-3 space-y-3">
              <select name="status" defaultValue={conversation.status}>
                <option value="open">open</option>
                <option value="pending">pending</option>
                <option value="resolved">resolved</option>
              </select>
              <select name="assigned_to" defaultValue={conversation.assigned_to ?? ""}>
                <option value="">Unassigned</option>
                {members.map((member) => <option key={member.user_id} value={member.user_id}>{memberName(member)} ({member.role})</option>)}
              </select>
              <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" name="mark_read" /> Mark inbound messages handled/read</label>
              <button className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white">Update handling</button>
            </form>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="font-semibold text-slate-950">Linked record</h2>
            {linkedHref ? <Link className="mt-2 inline-flex rounded-md bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-800" href={linkedHref}>Open linked {conversation.linked_entity_type}</Link> : <p className="mt-2 text-sm text-slate-600">No manual link yet.</p>}
            {(conversation.matched_leads.length > 0 || conversation.matched_clients.length > 0) ? (
              <div className="mt-3 rounded-md bg-amber-50 p-3 text-sm text-amber-900">
                Possible phone matches: {conversation.matched_leads.length} lead(s), {conversation.matched_clients.length} client(s). Confirm one below before linking.
              </div>
            ) : null}
            <form action={linkWhatsAppConversationAction.bind(null, conversation.id)} className="mt-3 space-y-3">
              <select name="linked_entity_type" defaultValue={conversation.linked_entity_type ?? "lead"}>
                <option value="lead">Lead</option>
                <option value="client">Client</option>
                <option value="deal">Deal</option>
              </select>
              <select name="linked_entity_id" defaultValue={conversation.linked_entity_id ?? ""} required>
                <option value="">Select record</option>
                <optgroup label="Leads">{(leads.data ?? []).map((lead) => <option key={`lead-${lead.id}`} value={lead.id}>{lead.name} · {lead.phone}</option>)}</optgroup>
                <optgroup label="Clients">{(clients.data ?? []).map((client) => <option key={`client-${client.id}`} value={client.id}>{client.business_name} · {client.phone}</option>)}</optgroup>
                <optgroup label="Deals">{(deals.data ?? []).map((deal) => <option key={`deal-${deal.id}`} value={deal.id}>{deal.title}</option>)}</optgroup>
              </select>
              <button className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold">Link conversation</button>
            </form>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="font-semibold text-slate-950">Create from chat</h2>
            <details className="mt-3 rounded-md border border-slate-200 p-3" open={!conversation.linked_entity_type}>
              <summary className="cursor-pointer text-sm font-semibold">Create lead</summary>
              <form action={createLeadFromWhatsAppConversationAction.bind(null, conversation.id)} className="mt-3 space-y-2">
                <input name="name" defaultValue={conversation.display_name ?? ""} placeholder="Lead name" required />
                <input name="phone" defaultValue={conversation.remote_phone} placeholder="Phone" required />
                <input name="service_interest" placeholder="Service interest" />
                <select name="owner_user_id" defaultValue={conversation.assigned_to ?? ""}><option value="">Assign owner</option>{members.map((member) => <option key={member.user_id} value={member.user_id}>{memberName(member)}</option>)}</select>
                <input type="datetime-local" name="next_follow_up_at" />
                <input name="task_title" placeholder="Optional follow-up task title" />
                <textarea name="notes" rows={4} defaultValue={recentText} />
                <button className="w-full rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white">Create lead</button>
              </form>
            </details>
            <details className="mt-3 rounded-md border border-slate-200 p-3">
              <summary className="cursor-pointer text-sm font-semibold">Create client</summary>
              <form action={createClientFromWhatsAppConversationAction.bind(null, conversation.id)} className="mt-3 space-y-2">
                <input name="business_name" defaultValue={conversation.display_name ?? ""} placeholder="Client/business name" required />
                <input name="primary_contact" defaultValue={conversation.display_name ?? ""} placeholder="Primary contact" />
                <input name="phone" defaultValue={conversation.remote_phone} placeholder="Phone" />
                <input name="email" placeholder="Email" />
                <textarea name="notes" rows={4} defaultValue={recentText} />
                <button className="w-full rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white">Create client</button>
              </form>
            </details>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="font-semibold text-slate-950">Quick actions</h2>
            <div className="mt-3 grid gap-2 text-sm">
              <Link className="rounded-md border border-slate-200 px-3 py-2" href={`/tasks/new?related_entity_type=whatsapp_conversation&related_entity_id=${conversation.id}`}>Create task/reminder</Link>
              <Link className="rounded-md border border-slate-200 px-3 py-2" href="/deals/new">Create deal</Link>
              <Link className="rounded-md border border-slate-200 px-3 py-2" href="/quotes/new">Draft quote</Link>
              <Link className="rounded-md border border-slate-200 px-3 py-2" href="/invoices">Find invoice for payment reminder</Link>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
