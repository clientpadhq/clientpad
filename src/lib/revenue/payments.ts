import { computeInvoiceStatus } from "@/lib/revenue/calculations";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function refreshInvoiceAmounts(workspaceId: string, invoiceId: string) {
  const supabase = await createClient();
  return refreshInvoiceAmountsWithClient(supabase, workspaceId, invoiceId);
}

async function refreshInvoiceAmountsWithClient(supabase: any, workspaceId: string, invoiceId: string) {
  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .select("total_amount,status,due_date")
    .eq("workspace_id", workspaceId)
    .eq("id", invoiceId)
    .single();
  if (invoiceError) throw invoiceError;

  const { data: payments, error: paymentsError } = await supabase
    .from("payments")
    .select("amount,status")
    .eq("workspace_id", workspaceId)
    .eq("invoice_id", invoiceId)
    .in("status", ["successful", "partially_paid", "manually_recorded"]);
  if (paymentsError) throw paymentsError;

  const paidAmount = (payments ?? []).reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
  const totalAmount = Number(invoice.total_amount || 0);
  const balanceAmount = Math.max(0, totalAmount - paidAmount);
  const status = computeInvoiceStatus({ status: invoice.status, dueDate: invoice.due_date, totalAmount, paidAmount });

  const { error: updateError } = await supabase
    .from("invoices")
    .update({ paid_amount: paidAmount, balance_amount: balanceAmount, status, updated_at: new Date().toISOString() })
    .eq("workspace_id", workspaceId)
    .eq("id", invoiceId);
  if (updateError) throw updateError;

  return { paidAmount, balanceAmount, status };
}

export async function handleWebhookPayment(params: {
  workspaceId: string;
  invoiceId: string;
  txRef: string;
  flwRef: string;
  amount: number;
  status: "successful" | "failed";
}) {
  const supabase = createAdminClient();
  const paymentStatus = params.status === "successful" ? "successful" : "failed";

  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .select("id")
    .eq("workspace_id", params.workspaceId)
    .eq("id", params.invoiceId)
    .maybeSingle();

  if (invoiceError || !invoice) {
    await supabase.from("activities").insert({
      workspace_id: params.workspaceId,
      entity_type: "invoice",
      entity_id: params.invoiceId,
      activity_type: "integration.flutterwave.error",
      description: "Webhook received for missing invoice",
      metadata: { tx_ref: params.txRef, flw_ref: params.flwRef },
    });
    return;
  }

  const { data: existing } = await supabase
    .from("payments")
    .select("id")
    .eq("workspace_id", params.workspaceId)
    .eq("external_reference", params.flwRef)
    .maybeSingle();

  if (!existing) {
    const { error: paymentInsertError } = await supabase.from("payments").insert({
      workspace_id: params.workspaceId,
      invoice_id: params.invoiceId,
      amount: Math.max(0, Number(params.amount || 0)),
      currency: "NGN",
      status: paymentStatus,
      method: "flutterwave",
      paid_at: new Date().toISOString(),
      transaction_reference: params.txRef,
      external_reference: params.flwRef,
      note: "Webhook payment event",
      source: "flutterwave_webhook",
    });

    if (paymentInsertError) {
      await supabase.from("activities").insert({
        workspace_id: params.workspaceId,
        entity_type: "invoice",
        entity_id: params.invoiceId,
        activity_type: "integration.flutterwave.error",
        description: "Webhook payment insert failed",
        metadata: { error: paymentInsertError.message, tx_ref: params.txRef, flw_ref: params.flwRef },
      });
      throw paymentInsertError;
    }
  }

  const invoiceState = await refreshInvoiceAmountsWithClient(supabase, params.workspaceId, params.invoiceId);

  await supabase.from("activities").insert({
    workspace_id: params.workspaceId,
    entity_type: "payment",
    entity_id: params.invoiceId,
    activity_type: "payment.webhook_received",
    description: `Webhook payment ${paymentStatus} received`,
    metadata: { tx_ref: params.txRef, flw_ref: params.flwRef },
  });

  if (invoiceState.status === "paid") {
    await supabase.from("activities").insert({
      workspace_id: params.workspaceId,
      entity_type: "invoice",
      entity_id: params.invoiceId,
      activity_type: "invoice.paid",
      description: "Invoice marked paid",
    });
  }
}
