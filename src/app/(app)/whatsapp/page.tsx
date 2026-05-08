import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { listWhatsAppConversations, type WhatsAppInboxFilter } from "@/lib/db/whatsapp";
import { requireWorkspace } from "@/lib/rbac/permissions";

const filters: Array<{ key: WhatsAppInboxFilter; label: string }> = [
  { key: "open", label: "Open" },
  { key: "pending", label: "Pending" },
  { key: "unread", label: "Unread" },
  { key: "unassigned", label: "Unassigned" },
  { key: "mine", label: "Mine" },
  { key: "unlinked", label: "Unlinked" },
  { key: "linked", label: "Linked" },
  { key: "resolved", label: "Resolved" },
  { key: "all", label: "All" },
];

function formatTime(value?: string | null) {
  if (!value) return "No messages yet";
  return new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function displayName(item: { display_name: string | null; remote_phone: string }) {
  return item.display_name || item.remote_phone || "Unknown WhatsApp contact";
}

export default async function WhatsAppInboxPage({ searchParams }: { searchParams?: Promise<{ filter?: string }> }) {
  const { workspace, user } = await requireWorkspace("staff");
  const params = await searchParams;
  const filter = (filters.some((item) => item.key === params?.filter) ? params?.filter : "open") as WhatsAppInboxFilter;
  const conversations = await listWhatsAppConversations(workspace.id, filter, user.id);

  return (
    <div className="space-y-4">
      <PageHeader
        title="WhatsApp workspace"
        description="Triage inbound WhatsApp conversations, assign ownership, link records, and reply without leaving ClientPad."
        action={<Link className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white" href="/settings">WhatsApp settings</Link>}
      />

      <div className="flex gap-2 overflow-x-auto rounded-lg border border-slate-200 bg-white p-2">
        {filters.map((item) => (
          <Link
            key={item.key}
            href={`/whatsapp?filter=${item.key}`}
            className={`whitespace-nowrap rounded-full px-3 py-1 text-sm font-medium ${filter === item.key ? "bg-emerald-100 text-emerald-900" : "text-slate-600 hover:bg-slate-100"}`}
          >
            {item.label}
          </Link>
        ))}
      </div>

      <div className="grid gap-3">
        {conversations.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
            No WhatsApp conversations match this queue yet. New inbound or sent WhatsApp messages will appear here grouped by contact phone/wa_id.
          </div>
        ) : (
          conversations.map((conversation) => (
            <Link
              key={conversation.id}
              href={`/whatsapp/${conversation.id}`}
              className="rounded-lg border border-slate-200 bg-white p-4 transition hover:border-emerald-300 hover:shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate font-semibold text-slate-950">{displayName(conversation)}</h2>
                    {conversation.unread_count > 0 ? (
                      <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-bold text-white">{conversation.unread_count} new</span>
                    ) : null}
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs capitalize text-slate-700">{conversation.status}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{conversation.remote_phone}</p>
                  <p className="mt-2 line-clamp-2 text-sm text-slate-700">
                    {conversation.latest_message
                      ? `${conversation.latest_message.direction === "outbound" ? "You: " : ""}${conversation.latest_message.content}`
                      : "No message preview available"}
                  </p>
                </div>
                <div className="shrink-0 text-right text-xs text-slate-500">
                  <p>{formatTime(conversation.last_message_at)}</p>
                  <p className="mt-2">Owner: {conversation.owner_name ?? "Unassigned"}</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                {conversation.linked_entity_type ? (
                  <span className="rounded-full bg-blue-50 px-2 py-1 text-blue-800">Linked to {conversation.linked_entity_type}</span>
                ) : conversation.matched_leads.length + conversation.matched_clients.length > 0 ? (
                  <span className="rounded-full bg-amber-50 px-2 py-1 text-amber-800">Possible CRM match</span>
                ) : (
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-600">Unlinked</span>
                )}
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
