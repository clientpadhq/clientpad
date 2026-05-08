import { createClient } from "@/lib/supabase/server";
import { normalizeNigerianPhone } from "@/lib/whatsapp";
import type { Client, Lead, WhatsAppConversation, WhatsAppMessageRecord } from "@/types/database";

export type WhatsAppInboxFilter =
  | "all"
  | "open"
  | "pending"
  | "resolved"
  | "unassigned"
  | "mine"
  | "linked"
  | "unlinked"
  | "unread";

export type WhatsAppConversationSummary = WhatsAppConversation & {
  latest_message: WhatsAppMessageRecord | null;
  unread_count: number;
  owner_name: string | null;
  matched_leads: Lead[];
  matched_clients: Client[];
};

export type WhatsAppConversationDetail = WhatsAppConversationSummary & {
  messages: WhatsAppMessageRecord[];
};

function normalizeThreadPhone(phone?: string | null) {
  const normalized = normalizeNigerianPhone(String(phone ?? ""));
  return normalized || String(phone ?? "").replace(/\D/g, "");
}

function remotePhoneForMessage(message: Pick<WhatsAppMessageRecord, "direction" | "from_phone" | "to_phone">) {
  return normalizeThreadPhone(message.direction === "inbound" ? message.from_phone : message.to_phone);
}

function messageDisplayName(message: WhatsAppMessageRecord) {
  const metadata = (message.metadata ?? {}) as Record<string, unknown>;
  const profileName = typeof metadata.profile_name === "string" ? metadata.profile_name.trim() : "";
  return profileName || null;
}

function phoneVariants(phone: string) {
  const digits = phone.replace(/\D/g, "");
  const variants = new Set<string>([phone, digits]);
  if (digits.startsWith("234")) variants.add(`0${digits.slice(3)}`);
  if (digits.startsWith("0")) variants.add(`234${digits.slice(1)}`);
  return Array.from(variants).filter(Boolean);
}

export async function ensureWhatsAppConversations(workspaceId: string) {
  const supabase = await createClient();
  const { data: messages, error } = await supabase
    .from("whatsapp_messages")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  const byPhone = new Map<string, { displayName: string | null; lastMessageAt: string }>();

  for (const message of (messages ?? []) as WhatsAppMessageRecord[]) {
    const remotePhone = remotePhoneForMessage(message);
    if (!remotePhone) continue;
    const existing = byPhone.get(remotePhone);
    byPhone.set(remotePhone, {
      displayName: messageDisplayName(message) ?? existing?.displayName ?? null,
      lastMessageAt: message.created_at,
    });
  }

  if (byPhone.size === 0) return;

  const upserts = Array.from(byPhone.entries()).map(([remote_phone, value]) => ({
    workspace_id: workspaceId,
    remote_phone,
    display_name: value.displayName,
    last_message_at: value.lastMessageAt,
    updated_at: new Date().toISOString(),
  }));

  const { error: upsertError } = await supabase
    .from("whatsapp_conversations")
    .upsert(upserts, { onConflict: "workspace_id,remote_phone" });
  if (upsertError) throw upsertError;

  const { data: conversations, error: conversationError } = await supabase
    .from("whatsapp_conversations")
    .select("id, remote_phone")
    .eq("workspace_id", workspaceId);
  if (conversationError) throw conversationError;

  for (const conversation of conversations ?? []) {
    const variants = phoneVariants(conversation.remote_phone);
    await supabase
      .from("whatsapp_messages")
      .update({ conversation_id: conversation.id })
      .eq("workspace_id", workspaceId)
      .is("conversation_id", null)
      .in("from_phone", variants);
    await supabase
      .from("whatsapp_messages")
      .update({ conversation_id: conversation.id })
      .eq("workspace_id", workspaceId)
      .is("conversation_id", null)
      .in("to_phone", variants);
  }
}

async function getMatches(workspaceId: string, remotePhone: string) {
  const supabase = await createClient();
  const variants = phoneVariants(remotePhone);
  const [leadsResult, clientsResult] = await Promise.all([
    supabase.from("leads").select("*").eq("workspace_id", workspaceId).in("phone", variants).limit(5),
    supabase.from("clients").select("*").eq("workspace_id", workspaceId).in("phone", variants).limit(5),
  ]);
  if (leadsResult.error) throw leadsResult.error;
  if (clientsResult.error) throw clientsResult.error;
  return {
    matched_leads: (leadsResult.data ?? []) as Lead[],
    matched_clients: (clientsResult.data ?? []) as Client[],
  };
}

async function decorateConversation(conversation: WhatsAppConversation): Promise<WhatsAppConversationSummary> {
  const supabase = await createClient();
  const [{ data: latestRows, error: latestError }, { data: unreadRows, error: unreadError }, matches] = await Promise.all([
    supabase
      .from("whatsapp_messages")
      .select("*")
      .eq("workspace_id", conversation.workspace_id)
      .eq("conversation_id", conversation.id)
      .order("created_at", { ascending: false })
      .limit(1),
    supabase
      .from("whatsapp_messages")
      .select("id")
      .eq("workspace_id", conversation.workspace_id)
      .eq("conversation_id", conversation.id)
      .eq("direction", "inbound")
      .gt("created_at", conversation.last_read_at ?? "1970-01-01T00:00:00.000Z"),
    getMatches(conversation.workspace_id, conversation.remote_phone),
  ]);

  if (latestError) throw latestError;
  if (unreadError) throw unreadError;

  let ownerName: string | null = null;
  if (conversation.assigned_to) {
    const { data } = await supabase.from("profiles").select("full_name").eq("id", conversation.assigned_to).maybeSingle();
    ownerName = data?.full_name ?? conversation.assigned_to.slice(0, 8);
  }

  return {
    ...conversation,
    latest_message: ((latestRows ?? [])[0] as WhatsAppMessageRecord | undefined) ?? null,
    unread_count: unreadRows?.length ?? 0,
    owner_name: ownerName,
    ...matches,
  };
}

export async function listWhatsAppConversations(workspaceId: string, filter: WhatsAppInboxFilter, userId: string) {
  await ensureWhatsAppConversations(workspaceId);
  const supabase = await createClient();
  let query = supabase
    .from("whatsapp_conversations")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .order("updated_at", { ascending: false });

  if (["open", "pending", "resolved"].includes(filter)) query = query.eq("status", filter);
  if (filter === "unassigned") query = query.is("assigned_to", null);
  if (filter === "mine") query = query.eq("assigned_to", userId);
  if (filter === "linked") query = query.not("linked_entity_type", "is", null);
  if (filter === "unlinked") query = query.is("linked_entity_type", null);

  const { data, error } = await query;
  if (error) throw error;
  const decorated = await Promise.all(((data ?? []) as WhatsAppConversation[]).map(decorateConversation));
  return filter === "unread" ? decorated.filter((item) => item.unread_count > 0) : decorated;
}

export async function getWhatsAppConversation(workspaceId: string, conversationId: string) {
  await ensureWhatsAppConversations(workspaceId);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("whatsapp_conversations")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("id", conversationId)
    .single();
  if (error) throw error;

  const { data: messages, error: messagesError } = await supabase
    .from("whatsapp_messages")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(200);
  if (messagesError) throw messagesError;

  const summary = await decorateConversation(data as WhatsAppConversation);
  return { ...summary, messages: (messages ?? []) as WhatsAppMessageRecord[] } as WhatsAppConversationDetail;
}

export async function getOrCreateWhatsAppConversation(params: {
  workspaceId: string;
  remotePhone: string;
  displayName?: string | null;
  createdBy?: string | null;
}) {
  const supabase = await createClient();
  const remotePhone = normalizeThreadPhone(params.remotePhone);
  const { data, error } = await supabase
    .from("whatsapp_conversations")
    .upsert(
      {
        workspace_id: params.workspaceId,
        remote_phone: remotePhone,
        display_name: params.displayName ?? null,
        last_message_at: new Date().toISOString(),
        created_by: params.createdBy ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "workspace_id,remote_phone" },
    )
    .select("*")
    .single();
  if (error) throw error;
  return data as WhatsAppConversation;
}
