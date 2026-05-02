import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookToken, markMessageAsRead } from "@/lib/whatsapp/api";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");  if (mode === "subscribe" && token) {
    if (verifyWebhookToken(token)) {
      return new NextResponse(challenge, { status: 200 });
    }
    return new NextResponse("Forbidden", { status: 403 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;    if (!value) {
      return NextResponse.json({ status: "ok" }, { status: 200 });
    }

    const messages = value?.messages || [];
    const statuses = value?.statuses || [];
    const contacts = value?.contacts || {};
    for (const msg of messages) {
      const contact = contacts?.find((c: {wa_id: string}) => c.wa_id === msg.from);
      const profileName = contact?.profile?.name || "Unknown";      if (msg.type === "text") {
        const supabase = await createClient();
        await supabase.from("whatsapp_messages").insert({
          workspace_id: (body.entry?.[0]?.id ? "00000000-0000-0000-0000-000000000001" : "00000000-0000-0000-0000-000000000001") as unknown as string,
          whatsapp_message_id: msg.id,
          from_phone: msg.from,
          to_phone: msg.to,
          message_type: "text",
          content: msg.text?.body || "",
          direction: "inbound",
          status: "sent",
          metadata: { profile_name: profileName },
        });
        if (msg.from) {
          await markMessageAsRead(msg.id);
        }
      }
    }
    for (const status of statuses) {
      const supabase = await createClient();
      if (status.status === "delivered") {
        await supabase
          .from("whatsapp_messages")
          .update({ status: "delivered", delivered_at: new Date().toISOString() })
          .eq("whatsapp_message_id", status.message_id);
      } else if (status.status === "read") {
        await supabase
          .from("whatsapp_messages")
          .update({ status: "read", read_at: new Date().toISOString() })
          .eq("whatsapp_message_id", status.message_id);
      }
    }

    return NextResponse.json({ status: "ok" }, { status: 200 });
  } catch (error) {
    console.error("[WhatsApp] Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}