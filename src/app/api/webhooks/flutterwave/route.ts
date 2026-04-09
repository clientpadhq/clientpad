import { NextResponse } from "next/server";
import { handleWebhookPayment } from "@/lib/revenue/payments";

export async function POST(request: Request) {
  const webhookHash = request.headers.get("verif-hash") ?? "";
  if (process.env.FLUTTERWAVE_WEBHOOK_HASH && webhookHash !== process.env.FLUTTERWAVE_WEBHOOK_HASH) {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
  }

  const payload = await request.json();
  const data = payload?.data;

  if (!data) {
    return NextResponse.json({ ok: true });
  }

  const workspaceId = data?.meta?.workspace_id;
  const invoiceId = data?.meta?.invoice_id;
  const txRef = data?.tx_ref;
  const flwRef = data?.flw_ref;
  const status = data?.status;

  if (!workspaceId || !invoiceId || !txRef || !flwRef) {
    return NextResponse.json({ ok: true });
  }

  await handleWebhookPayment({
    workspaceId,
    invoiceId,
    txRef,
    flwRef,
    amount: Number(data?.amount ?? 0),
    status: status === "successful" ? "successful" : "failed",
  });

  return NextResponse.json({ ok: true });
}
