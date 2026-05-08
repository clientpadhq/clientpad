import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendWhatsAppMessage } from "@/lib/whatsapp/api";
import { getOrCreateWhatsAppConversation } from "@/lib/db/whatsapp";
import { logActivity } from "@/lib/db/activity";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { to, message, workspace_id, linked_entity_type, linked_entity_id } = body;

    if (!to || !message) {
      return NextResponse.json(
        { error: "Missing required fields: to, message" },
        { status: 400 }
      );
    }

    if (!workspace_id) {
      return NextResponse.json(
        { error: "Missing workspace_id" },
        { status: 400 }
      );
    }

    const { data: membership } = await supabase
      .from("workspace_members")
      .select("role, workspace_id")
      .eq("workspace_id", workspace_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!membership) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const result = await sendWhatsAppMessage(to, message, {
      workspace_id,
      linked_entity_type,
      linked_entity_id,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to send message" },
        { status: 500 }
      );
    }

    const conversation = await getOrCreateWhatsAppConversation({
      workspaceId: workspace_id,
      remotePhone: to,
      createdBy: user.id,
    });

    await supabase.from("whatsapp_messages").insert({
      workspace_id,
      conversation_id: conversation.id,
      whatsapp_message_id: result.message_id,
      from_phone: process.env.WHATSAPP_PHONE_NUMBER_ID || "",
      to_phone: to,
      message_type: "text",
      content: message,
      direction: "outbound",
      status: "sent",
      linked_entity_type,
      linked_entity_id,
      metadata: { sent_from: "api" },
    });

    await supabase
      .from("whatsapp_conversations")
      .update({ last_message_at: new Date().toISOString(), last_handled_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("workspace_id", workspace_id)
      .eq("id", conversation.id);

    await logActivity({
      workspaceId: workspace_id,
      actorUserId: user.id,
      entityType: "whatsapp_conversation",
      entityId: conversation.id,
      type: "whatsapp.message_sent",
      description: "WhatsApp message sent",
      metadata: { message_id: result.message_id, linked_entity_type, linked_entity_id },
    });

    return NextResponse.json({ success: true, message_id: result.message_id });
  } catch (error) {
    console.error("[WhatsApp] Send error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}