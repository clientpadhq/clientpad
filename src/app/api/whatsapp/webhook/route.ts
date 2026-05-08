import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookToken, markMessageAsRead } from "@/lib/whatsapp/api";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateWhatsAppConversation } from "@/lib/db/whatsapp";

async function resolveWorkspaceId(phoneNumberId?: string | null) {
  const supabase = await createClient();
  if (phoneNumberId) {
    const { data } = await supabase
      .from("workspace_whatsapp_config")
      .select("workspace_id")
      .eq("phone_number_id", phoneNumberId)
      .eq("enabled", true)
      .maybeSingle();
    if (data?.workspace_id) return data.workspace_id as string;
  }
  return process.env.WHATSAPP_DEFAULT_WORKSPACE_ID || "00000000-0000-0000-0000-000000000001";
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token && verifyWebhookToken(token)) {
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const entries = body.entry ?? [];

    for (const entry of entries) {
      for (const change of entry.changes ?? []) {
        const value = change?.value;
        if (!value) continue;

        const workspaceId = await resolveWorkspaceId(value.metadata?.phone_number_id ?? null);
        const messages = value.messages ?? [];
        const statuses = value.statuses ?? [];
        const contacts = value.contacts ?? [];

        for (const msg of messages) {
          const contact = contacts.find((item: { wa_id: string }) => item.wa_id === msg.from);
          const profileName = contact?.profile?.name || null;
          if (msg.type !== "text") continue;

          const supabase = await createClient();
          const conversation = await getOrCreateWhatsAppConversation({
            workspaceId,
            remotePhone: msg.from,
            displayName: profileName,
          });

          await supabase.from("whatsapp_messages").insert({
            workspace_id: workspaceId,
            conversation_id: conversation.id,
            whatsapp_message_id: msg.id,
            from_phone: msg.from,
            to_phone: value.metadata?.display_phone_number || value.metadata?.phone_number_id || "ClientPad",
            message_type: "text",
            content: msg.text?.body || "",
            direction: "inbound",
            status: "sent",
            linked_entity_type: conversation.linked_entity_type,
            linked_entity_id: conversation.linked_entity_id,
            metadata: { profile_name: profileName, wa_id: msg.from, phone_number_id: value.metadata?.phone_number_id },
          });

          await supabase
            .from("whatsapp_conversations")
            .update({
              display_name: profileName ?? conversation.display_name,
              status: conversation.status === "resolved" ? "open" : conversation.status,
              last_message_at: new Date(Number(msg.timestamp || Date.now() / 1000) * 1000).toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("workspace_id", workspaceId)
            .eq("id", conversation.id);

          if (msg.from) await markMessageAsRead(msg.id);
        }

        for (const status of statuses) {
          const supabase = await createClient();
          if (status.status === "delivered") {
            await supabase
              .from("whatsapp_messages")
              .update({ status: "delivered", delivered_at: new Date().toISOString() })
              .eq("whatsapp_message_id", status.message_id ?? status.id);
          } else if (status.status === "read") {
            await supabase
              .from("whatsapp_messages")
              .update({ status: "read", read_at: new Date().toISOString() })
              .eq("whatsapp_message_id", status.message_id ?? status.id);
          } else if (status.status === "failed") {
            await supabase
              .from("whatsapp_messages")
              .update({ status: "failed" })
              .eq("whatsapp_message_id", status.message_id ?? status.id);
          }
        }
      }
    }

    return NextResponse.json({ status: "ok" }, { status: 200 });
  } catch (error) {
    console.error("[WhatsApp] Webhook error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
