import { NextResponse } from "next/server";
import { handleWebhookPayment } from "@/lib/revenue/payments";

export async function POST(request: Request) {
  try {
    const webhookHash = request.headers.get("verif-hash") ?? "";
    const expectedHash = process.env.FLUTTERWAVE_WEBHOOK_HASH;

    if (!expectedHash) {
      return NextResponse.json({ error: "Webhook hash not configured" }, { status: 500 });
    }

    if (webhookHash !== expectedHash) {
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
    }

    const payload = await request.json();
    const data = payload?.data;
    if (!data) return NextResponse.json({ ok: true });

    const workspaceId = typeof data?.meta?.workspace_id === "string" ? data.meta.workspace_id : "";
    const invoiceId = typeof data?.meta?.invoice_id === "string" ? data.meta.invoice_id : "";
    const transactionId = Number(data?.id);

    if (!workspaceId || !invoiceId || !Number.isInteger(transactionId) || transactionId <= 0) {
      return NextResponse.json({ ok: true, ignored: "missing identifiers" });
    }

    await handleWebhookPayment({
      workspaceId,
      invoiceId,
      transactionId,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Webhook processing failed" }, { status: 500 });
  }
}
