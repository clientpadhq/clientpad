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

    const workspaceId = data?.meta?.workspace_id;
    const invoiceId = data?.meta?.invoice_id;
    const txRef = data?.tx_ref;
    const flwRef = data?.flw_ref;
    const status = data?.status;
    const amount = Number(data?.amount ?? 0);

    if (!workspaceId || !invoiceId || !txRef || !flwRef || Number.isNaN(amount)) {
      return NextResponse.json({ ok: true, ignored: "missing fields" });
    }

    await handleWebhookPayment({
      workspaceId,
      invoiceId,
      txRef,
      flwRef,
      amount: Math.max(0, amount),
      status: status === "successful" ? "successful" : "failed",
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Webhook processing failed" }, { status: 500 });
  }
}
