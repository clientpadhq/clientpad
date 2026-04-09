import { computeInvoiceStatus } from "@/lib/revenue/calculations";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const WEBHOOK_AMOUNT_TOLERANCE = 1;

type FlutterwaveVerification = {
  id: number;
  status: string;
  amount: number;
  currency: string;
  tx_ref: string;
  flw_ref: string | null;
};

type VerificationFailureReason =
  | "invoice_not_found"
  | "missing_invoice_tx_ref"
  | "verification_not_successful"
  | "currency_mismatch"
  | "tx_ref_mismatch"
  | "amount_out_of_tolerance";

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
  const status = computeInvoiceStatus({
    status: invoice.status,
    dueDate: invoice.due_date,
    totalAmount,
    paidAmount,
  });

  const { error: updateError } = await supabase
    .from("invoices")
    .update({
      paid_amount: paidAmount,
      balance_amount: balanceAmount,
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("workspace_id", workspaceId)
    .eq("id", invoiceId);
  if (updateError) throw updateError;

  return { paidAmount, balanceAmount, status };
}

async function verifyFlutterwaveTransaction(transactionId: number): Promise<FlutterwaveVerification | null> {
  if (!process.env.FLUTTERWAVE_SECRET_KEY) throw new Error("Flutterwave secret key not configured");

  const response = await fetch(`https://api.flutterwave.com/v3/transactions/${transactionId}/verify`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) return null;

  const json = await response.json();
  const data = json?.data;

  const verifiedId = Number(data?.id);
  const amount = Number(data?.amount ?? 0);

  if (!Number.isInteger(verifiedId) || verifiedId <= 0 || Number.isNaN(amount) || !data?.tx_ref) {
    return null;
  }

  return {
    id: verifiedId,
    status: String(data?.status ?? ""),
    amount,
    currency: String(data?.currency ?? ""),
    tx_ref: String(data?.tx_ref ?? ""),
    flw_ref: data?.flw_ref ? String(data.flw_ref) : null,
  };
}

async function recordWebhookFailureActivity(params: {
  workspaceId: string;
  invoiceId: string;
  transactionId: number;
  reason: VerificationFailureReason;
  details?: Record<string, unknown>;
}) {
  const supabase = createAdminClient();

  await supabase.from("activities").insert({
    workspace_id: params.workspaceId,
    entity_type: "payment",
    entity_id: params.invoiceId,
    activity_type: "payment.webhook_rejected",
    description: `Flutterwave webhook rejected: ${params.reason}`,
    metadata: {
      transaction_id: params.transactionId,
      reason: params.reason,
      ...(params.details ?? {}),
    },
  });
}

export async function handleWebhookPayment(params: {
  workspaceId: string;
  invoiceId: string;
  transactionId: number;
}) {
  const supabase = createAdminClient();

  const { data: invoice } = await supabase
    .from("invoices")
    .select("id, workspace_id, total_amount, flutterwave_tx_ref")
    .eq("workspace_id", params.workspaceId)
    .eq("id", params.invoiceId)
    .maybeSingle();

  if (!invoice) {
    await recordWebhookFailureActivity({
      workspaceId: params.workspaceId,
      invoiceId: params.invoiceId,
      transactionId: params.transactionId,
      reason: "invoice_not_found",
    });
    return;
  }

  const expectedTxRef = String(invoice.flutterwave_tx_ref ?? "").trim();
  if (!expectedTxRef) {
    await recordWebhookFailureActivity({
      workspaceId: params.workspaceId,
      invoiceId: params.invoiceId,
      transactionId: params.transactionId,
      reason: "missing_invoice_tx_ref",
    });
    return;
  }

  const verified = await verifyFlutterwaveTransaction(params.transactionId);
  if (!verified || verified.status !== "successful") {
    await recordWebhookFailureActivity({
      workspaceId: params.workspaceId,
      invoiceId: params.invoiceId,
      transactionId: params.transactionId,
      reason: "verification_not_successful",
      details: { verified_status: verified?.status ?? null },
    });
    return;
  }

  if (verified.currency !== "NGN") {
    await recordWebhookFailureActivity({
      workspaceId: params.workspaceId,
      invoiceId: params.invoiceId,
      transactionId: params.transactionId,
      reason: "currency_mismatch",
      details: { verified_currency: verified.currency },
    });
    return;
  }

  if (verified.tx_ref !== expectedTxRef) {
    await recordWebhookFailureActivity({
      workspaceId: params.workspaceId,
      invoiceId: params.invoiceId,
      transactionId: params.transactionId,
      reason: "tx_ref_mismatch",
      details: { expected_tx_ref: expectedTxRef, verified_tx_ref: verified.tx_ref },
    });
    return;
  }

  const expectedAmount = Number(invoice.total_amount ?? 0);
  if (Math.abs(verified.amount - expectedAmount) > WEBHOOK_AMOUNT_TOLERANCE) {
    await recordWebhookFailureActivity({
      workspaceId: params.workspaceId,
      invoiceId: params.invoiceId,
      transactionId: params.transactionId,
      reason: "amount_out_of_tolerance",
      details: { expected_amount: expectedAmount, verified_amount: verified.amount },
    });
    return;
  }

  const providerReference = `flutterwave:transaction:${verified.id}`;

  const references = [providerReference, verified.flw_ref].filter((value): value is string => Boolean(value));

  const { data: existingPayment } = await supabase
    .from("payments")
    .select("id")
    .eq("workspace_id", params.workspaceId)
    .in("external_reference", references)
    .limit(1);

  if (existingPayment && existingPayment.length > 0) {
    await supabase.from("activities").insert({
      workspace_id: params.workspaceId,
      entity_type: "payment",
      entity_id: params.invoiceId,
      activity_type: "payment.webhook_duplicate",
      description: "Duplicate Flutterwave webhook ignored",
      metadata: { transaction_id: verified.id, tx_ref: verified.tx_ref },
    });
    return;
  }

  await supabase.from("payments").insert({
    workspace_id: params.workspaceId,
    invoice_id: params.invoiceId,
    amount: Math.max(0, Number(verified.amount || 0)),
    currency: verified.currency,
    status: "successful",
    method: "flutterwave",
    paid_at: new Date().toISOString(),
    transaction_reference: verified.tx_ref,
    external_reference: providerReference,
    note: "Webhook payment verified with Flutterwave",
    source: "flutterwave_webhook",
  });

  const invoiceState = await refreshInvoiceAmountsWithClient(supabase, params.workspaceId, params.invoiceId);

  await supabase.from("activities").insert({
    workspace_id: params.workspaceId,
    entity_type: "payment",
    entity_id: params.invoiceId,
    activity_type: "payment.webhook_received",
    description: "Verified Flutterwave payment recorded",
    metadata: { tx_ref: verified.tx_ref, flw_ref: verified.flw_ref, transaction_id: verified.id },
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
