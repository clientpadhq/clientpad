"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logActivity } from "@/lib/db/activity";
import { getWhatsAppConversation, getOrCreateWhatsAppConversation } from "@/lib/db/whatsapp";
import { requireWorkspace } from "@/lib/rbac/permissions";
import { createClient } from "@/lib/supabase/server";
import { sendWhatsAppMessage } from "@/lib/whatsapp/api";

function field(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function recentNotes(messages: { direction: string; content: string; created_at: string }[]) {
  return messages
    .slice(-6)
    .map((message) => `${message.direction === "inbound" ? "Customer" : "Team"}: ${message.content}`)
    .join("\n");
}

export async function updateWhatsAppConversationAction(conversationId: string, formData: FormData) {
  const { workspace, user } = await requireWorkspace("staff");
  const supabase = await createClient();
  const conversation = await getWhatsAppConversation(workspace.id, conversationId);
  const nextStatus = field(formData, "status") || conversation.status;
  const assignedTo = field(formData, "assigned_to") || null;
  const markRead = field(formData, "mark_read") === "on";

  const { error } = await supabase
    .from("whatsapp_conversations")
    .update({
      status: nextStatus,
      assigned_to: assignedTo,
      last_handled_at: new Date().toISOString(),
      last_read_at: markRead ? new Date().toISOString() : conversation.last_read_at,
      updated_at: new Date().toISOString(),
    })
    .eq("workspace_id", workspace.id)
    .eq("id", conversationId);

  if (error) redirect(`/whatsapp/${conversationId}?error=${encodeURIComponent(error.message)}`);

  if (conversation.assigned_to !== assignedTo) {
    await logActivity({
      workspaceId: workspace.id,
      actorUserId: user.id,
      entityType: "whatsapp_conversation",
      entityId: conversationId,
      type: "whatsapp.conversation_assigned",
      description: assignedTo ? "WhatsApp conversation assigned" : "WhatsApp conversation unassigned",
      metadata: { assigned_to: assignedTo },
    });
  }

  if (conversation.status !== nextStatus) {
    await logActivity({
      workspaceId: workspace.id,
      actorUserId: user.id,
      entityType: "whatsapp_conversation",
      entityId: conversationId,
      type: "whatsapp.conversation_status_changed",
      description: `WhatsApp conversation marked ${nextStatus}`,
      metadata: { previous_status: conversation.status, status: nextStatus },
    });
  }

  revalidatePath("/whatsapp");
  revalidatePath(`/whatsapp/${conversationId}`);
}

export async function linkWhatsAppConversationAction(conversationId: string, formData: FormData) {
  const { workspace, user } = await requireWorkspace("staff");
  const supabase = await createClient();
  const entityType = field(formData, "linked_entity_type");
  const entityId = field(formData, "linked_entity_id");
  const conversation = await getWhatsAppConversation(workspace.id, conversationId);

  if (!entityType || !entityId) redirect(`/whatsapp/${conversationId}?error=${encodeURIComponent("Choose a record to link")}`);
  if (!["lead", "client", "deal"].includes(entityType)) {
    redirect(`/whatsapp/${conversationId}?error=${encodeURIComponent("Unsupported linked record type")}`);
  }

  const { error } = await supabase
    .from("whatsapp_conversations")
    .update({ linked_entity_type: entityType, linked_entity_id: entityId, updated_at: new Date().toISOString() })
    .eq("workspace_id", workspace.id)
    .eq("id", conversationId);

  if (error) redirect(`/whatsapp/${conversationId}?error=${encodeURIComponent(error.message)}`);

  await supabase
    .from("whatsapp_messages")
    .update({ linked_entity_type: entityType, linked_entity_id: entityId })
    .eq("workspace_id", workspace.id)
    .eq("conversation_id", conversationId);

  await logActivity({
    workspaceId: workspace.id,
    actorUserId: user.id,
    entityType: "whatsapp_conversation",
    entityId: conversationId,
    type: "whatsapp.conversation_linked",
    description: `WhatsApp conversation linked to ${entityType}`,
    metadata: { linked_entity_type: entityType, linked_entity_id: entityId, remote_phone: conversation.remote_phone },
  });

  revalidatePath("/whatsapp");
  revalidatePath(`/whatsapp/${conversationId}`);
}

export async function createLeadFromWhatsAppConversationAction(conversationId: string, formData: FormData) {
  const { workspace, user } = await requireWorkspace("staff");
  const supabase = await createClient();
  const conversation = await getWhatsAppConversation(workspace.id, conversationId);

  const payload = {
    workspace_id: workspace.id,
    name: field(formData, "name") || conversation.display_name || conversation.remote_phone,
    phone: field(formData, "phone") || conversation.remote_phone,
    source: "WhatsApp",
    service_interest: field(formData, "service_interest") || null,
    status: "new",
    owner_user_id: field(formData, "owner_user_id") || user.id,
    next_follow_up_at: field(formData, "next_follow_up_at") || null,
    urgency: field(formData, "urgency") || null,
    budget_clue: null,
    notes: field(formData, "notes") || recentNotes(conversation.messages) || null,
  };

  const { data, error } = await supabase.from("leads").insert(payload).select("id").single();
  if (error || !data) redirect(`/whatsapp/${conversationId}?error=${encodeURIComponent(error?.message ?? "Unable to create lead")}`);

  await supabase
    .from("whatsapp_conversations")
    .update({ linked_entity_type: "lead", linked_entity_id: data.id, assigned_to: payload.owner_user_id, updated_at: new Date().toISOString() })
    .eq("workspace_id", workspace.id)
    .eq("id", conversationId);

  await logActivity({ workspaceId: workspace.id, actorUserId: user.id, entityType: "lead", entityId: data.id, type: "lead.created", description: `Lead created from WhatsApp: ${payload.name}` });
  await logActivity({
    workspaceId: workspace.id,
    actorUserId: user.id,
    entityType: "whatsapp_conversation",
    entityId: conversationId,
    type: "whatsapp.lead_created",
    description: "Lead created from WhatsApp conversation",
    metadata: { lead_id: data.id, remote_phone: conversation.remote_phone },
  });

  if (field(formData, "task_title")) {
    await supabase.from("tasks").insert({
      workspace_id: workspace.id,
      title: field(formData, "task_title"),
      description: "Follow up from WhatsApp conversation",
      related_entity_type: "lead",
      related_entity_id: data.id,
      assignee_user_id: payload.owner_user_id,
      owner_user_id: user.id,
      due_at: field(formData, "next_follow_up_at") || null,
      priority: "medium",
      status: "open",
      created_by: user.id,
    });
  }

  redirect(`/leads/${data.id}`);
}

export async function createClientFromWhatsAppConversationAction(conversationId: string, formData: FormData) {
  const { workspace, user } = await requireWorkspace("staff");
  const supabase = await createClient();
  const conversation = await getWhatsAppConversation(workspace.id, conversationId);
  const payload = {
    workspace_id: workspace.id,
    business_name: field(formData, "business_name") || conversation.display_name || conversation.remote_phone,
    primary_contact: field(formData, "primary_contact") || conversation.display_name || null,
    phone: field(formData, "phone") || conversation.remote_phone,
    email: field(formData, "email") || null,
    location: null,
    notes: field(formData, "notes") || recentNotes(conversation.messages) || null,
  };

  const { data, error } = await supabase.from("clients").insert(payload).select("id").single();
  if (error || !data) redirect(`/whatsapp/${conversationId}?error=${encodeURIComponent(error?.message ?? "Unable to create client")}`);

  await supabase
    .from("whatsapp_conversations")
    .update({ linked_entity_type: "client", linked_entity_id: data.id, updated_at: new Date().toISOString() })
    .eq("workspace_id", workspace.id)
    .eq("id", conversationId);

  await logActivity({ workspaceId: workspace.id, actorUserId: user.id, entityType: "client", entityId: data.id, type: "client.created", description: `Client created from WhatsApp: ${payload.business_name}` });
  await logActivity({
    workspaceId: workspace.id,
    actorUserId: user.id,
    entityType: "whatsapp_conversation",
    entityId: conversationId,
    type: "whatsapp.client_created",
    description: "Client created from WhatsApp conversation",
    metadata: { client_id: data.id, remote_phone: conversation.remote_phone },
  });

  redirect(`/clients/${data.id}`);
}

export async function sendWhatsAppConversationReplyAction(conversationId: string, formData: FormData) {
  const { workspace, user } = await requireWorkspace("staff");
  const supabase = await createClient();
  const conversation = await getWhatsAppConversation(workspace.id, conversationId);
  const message = field(formData, "message");

  if (!message) redirect(`/whatsapp/${conversationId}?error=${encodeURIComponent("Write a reply before sending")}`);

  const result = await sendWhatsAppMessage(conversation.remote_phone, message, {
    workspace_id: workspace.id,
    linked_entity_type: conversation.linked_entity_type ?? undefined,
    linked_entity_id: conversation.linked_entity_id ?? undefined,
  });

  if (!result.success) redirect(`/whatsapp/${conversationId}?error=${encodeURIComponent(result.error ?? "Unable to send reply")}`);

  const ensured = await getOrCreateWhatsAppConversation({
    workspaceId: workspace.id,
    remotePhone: conversation.remote_phone,
    displayName: conversation.display_name,
    createdBy: user.id,
  });

  const { error } = await supabase.from("whatsapp_messages").insert({
    workspace_id: workspace.id,
    conversation_id: ensured.id,
    whatsapp_message_id: result.message_id,
    from_phone: process.env.WHATSAPP_PHONE_NUMBER_ID || "ClientPad",
    to_phone: conversation.remote_phone,
    message_type: "text",
    content: message,
    direction: "outbound",
    status: "sent",
    linked_entity_type: conversation.linked_entity_type,
    linked_entity_id: conversation.linked_entity_id,
    metadata: { sent_from: "whatsapp_inbox" },
  });

  if (error) redirect(`/whatsapp/${conversationId}?error=${encodeURIComponent(error.message)}`);

  await supabase
    .from("whatsapp_conversations")
    .update({ status: "pending", last_handled_at: new Date().toISOString(), last_message_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("workspace_id", workspace.id)
    .eq("id", conversationId);

  await logActivity({
    workspaceId: workspace.id,
    actorUserId: user.id,
    entityType: "whatsapp_conversation",
    entityId: conversationId,
    type: "whatsapp.message_sent",
    description: "WhatsApp reply sent from inbox",
    metadata: { message_id: result.message_id },
  });

  redirect(`/whatsapp/${conversationId}?sent=1`);
}
