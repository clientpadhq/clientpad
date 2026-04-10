"use server";

import { randomUUID } from "crypto";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireWorkspace } from "@/lib/rbac/permissions";
import { logActivity } from "@/lib/db/activity";
import {
  calculateRevenueTotals,
  computeInvoiceStatus,
  parseItemsFromFormData,
} from "@/lib/revenue/calculations";
import { refreshInvoiceAmounts } from "@/lib/revenue/payments";

async function validateWorkspaceRecord(
  supabase: Awaited<ReturnType<typeof createClient>>,
  workspaceId: string,
  table: "deals" | "clients" | "quotes" | "invoices",
  recordId: string | null,
  label: string,
) {
  if (!recordId) return null;
  const { data } = await supabase.from(table).select("id").eq("workspace_id", workspaceId).eq("id", recordId).maybeSingle();
  if (!data) return `${label} does not belong to this workspace.`;
  return null;
}

async function validateRevenueLinks(
  supabase: Awaited<ReturnType<typeof createClient>>,
  workspaceId: string,
  links: { dealId?: string | null; clientId?: string | null; quoteId?: string | null; invoiceId?: string | null },
) {
  const checks = await Promise.all([
    validateWorkspaceRecord(supabase, workspaceId, "deals", links.dealId ?? null, "Selected deal"),
    validateWorkspaceRecord(supabase, workspaceId, "clients", links.clientId ?? null, "Selected client"),
    validateWorkspaceRecord(supabase, workspaceId, "quotes", links.quoteId ?? null, "Selected quote"),
    validateWorkspaceRecord(supabase, workspaceId, "invoices", links.invoiceId ?? null, "Selected invoice"),
  ]);
  return checks.find(Boolean) ?? null;
}

export async function createQuoteAction(formData: FormData) {
  const { workspace, user, role } = await requireWorkspace("staff");
  if (role === "staff") throw new Error("Staff cannot create quotes.");

  const supabase = await createClient();
  const items = parseItemsFromFormData(formData);
  if (!items.length) redirect("/quotes/new?error=At least one line item is required");

  const totals = calculateRevenueTotals({
    items,
    discountAmount: Number(formData.get("discount_amount") ?? 0),
    taxAmount: Number(formData.get("tax_amount") ?? 0),
  });
  const dealId = String(formData.get("deal_id") ?? "").trim() || null;
  const clientId = String(formData.get("client_id") ?? "").trim() || null;
  const linkError = await validateRevenueLinks(supabase, workspace.id, { dealId, clientId });
  if (linkError) redirect(`/quotes/new?error=${encodeURIComponent(linkError)}`);

  const { data: quoteNumberData, error: quoteNumberError } = await supabase.rpc("next_document_number", {
    target_workspace: workspace.id,
    target_doc_type: "quote",
  });
  if (quoteNumberError) throw quoteNumberError;

  const quotePayload = {
    workspace_id: workspace.id,
    quote_number: quoteNumberData,
    deal_id: dealId,
    client_id: clientId,
    status: String(formData.get("status") ?? "draft"),
    issue_date: String(formData.get("issue_date") ?? new Date().toISOString().slice(0, 10)),
    valid_until: String(formData.get("valid_until") ?? "").trim() || null,
    subtotal: totals.subtotal,
    discount_amount: totals.discountAmount,
    tax_amount: totals.taxAmount,
    total_amount: totals.total,
    notes: String(formData.get("notes") ?? "").trim() || null,
    terms: String(formData.get("terms") ?? "").trim() || null,
    created_by: user.id,
  };

  const { data: quote, error } = await supabase.from("quotes").insert(quotePayload).select("id").single();
  if (error || !quote) redirect(`/quotes/new?error=${encodeURIComponent(error?.message ?? "Unable to create quote")}`);

  await supabase.from("quote_items").insert(
    totals.items.map((item, index) => ({
      workspace_id: workspace.id,
      quote_id: quote.id,
      position: index + 1,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      line_total: item.lineTotal,
      notes: item.notes ?? null,
    })),
  );

  await logActivity({ workspaceId: workspace.id, actorUserId: user.id, entityType: "quote", entityId: quote.id, type: "quote.created", description: `Quote created: ${quotePayload.quote_number}` });
  redirect(`/quotes/${quote.id}`);
}

export async function updateQuoteAction(quoteId: string, formData: FormData) {
  const { workspace, user, role } = await requireWorkspace("staff");
  if (role === "staff") throw new Error("Staff cannot update quotes.");

  const supabase = await createClient();
  const items = parseItemsFromFormData(formData);
  if (!items.length) redirect(`/quotes/${quoteId}/edit?error=At least one line item is required`);

  const totals = calculateRevenueTotals({
    items,
    discountAmount: Number(formData.get("discount_amount") ?? 0),
    taxAmount: Number(formData.get("tax_amount") ?? 0),
  });

  const nextStatus = String(formData.get("status") ?? "draft");
  const dealId = String(formData.get("deal_id") ?? "").trim() || null;
  const clientId = String(formData.get("client_id") ?? "").trim() || null;
  const linkError = await validateRevenueLinks(supabase, workspace.id, { dealId, clientId });
  if (linkError) redirect(`/quotes/${quoteId}/edit?error=${encodeURIComponent(linkError)}`);
  const updatePayload = {
    deal_id: dealId,
    client_id: clientId,
    status: nextStatus,
    issue_date: String(formData.get("issue_date") ?? new Date().toISOString().slice(0, 10)),
    valid_until: String(formData.get("valid_until") ?? "").trim() || null,
    subtotal: totals.subtotal,
    discount_amount: totals.discountAmount,
    tax_amount: totals.taxAmount,
    total_amount: totals.total,
    notes: String(formData.get("notes") ?? "").trim() || null,
    terms: String(formData.get("terms") ?? "").trim() || null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("quotes").update(updatePayload).eq("workspace_id", workspace.id).eq("id", quoteId);
  if (error) redirect(`/quotes/${quoteId}/edit?error=${encodeURIComponent(error.message)}`);

  await supabase.from("quote_items").delete().eq("workspace_id", workspace.id).eq("quote_id", quoteId);
  await supabase.from("quote_items").insert(
    totals.items.map((item, index) => ({
      workspace_id: workspace.id,
      quote_id: quoteId,
      position: index + 1,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      line_total: item.lineTotal,
      notes: item.notes ?? null,
    })),
  );

  await logActivity({ workspaceId: workspace.id, actorUserId: user.id, entityType: "quote", entityId: quoteId, type: "quote.updated", description: "Quote updated" });
  if (nextStatus === "sent") await logActivity({ workspaceId: workspace.id, actorUserId: user.id, entityType: "quote", entityId: quoteId, type: "quote.sent", description: "Quote marked as sent" });
  if (nextStatus === "accepted") await logActivity({ workspaceId: workspace.id, actorUserId: user.id, entityType: "quote", entityId: quoteId, type: "quote.accepted", description: "Quote accepted" });

  redirect(`/quotes/${quoteId}`);
}

export async function convertQuoteToInvoiceAction(quoteId: string) {
  const { workspace, user, role } = await requireWorkspace("staff");
  if (role === "staff") throw new Error("Staff cannot convert quotes.");
  const supabase = await createClient();

  const { data: quote, error } = await supabase.from("quotes").select("*").eq("workspace_id", workspace.id).eq("id", quoteId).single();
  if (error || !quote) throw error;
  if (quote.status !== "accepted") redirect(`/quotes/${quoteId}?error=Only accepted quotes can be converted`);

  const { data: items } = await supabase.from("quote_items").select("*").eq("workspace_id", workspace.id).eq("quote_id", quoteId).order("position", { ascending: true });
  const { data: invoiceNumberData, error: invoiceNumberError } = await supabase.rpc("next_document_number", { target_workspace: workspace.id, target_doc_type: "invoice" });
  if (invoiceNumberError) throw invoiceNumberError;

  const { data: invoice, error: createError } = await supabase
    .from("invoices")
    .insert({
      workspace_id: workspace.id,
      invoice_number: invoiceNumberData,
      quote_id: quote.id,
      deal_id: quote.deal_id,
      client_id: quote.client_id,
      status: "issued",
      issue_date: new Date().toISOString().slice(0, 10),
      due_date: quote.valid_until,
      subtotal: quote.subtotal,
      discount_amount: quote.discount_amount,
      tax_amount: quote.tax_amount,
      total_amount: quote.total_amount,
      paid_amount: 0,
      balance_amount: quote.total_amount,
      notes: quote.notes,
      created_by: user.id,
    })
    .select("id")
    .single();
  if (createError || !invoice) throw createError;

  if (items?.length) {
    await supabase.from("invoice_items").insert(items.map((item) => ({
      workspace_id: workspace.id,
      invoice_id: invoice.id,
      position: item.position,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      line_total: item.line_total,
      notes: item.notes,
    })));
  }

  await logActivity({ workspaceId: workspace.id, actorUserId: user.id, entityType: "invoice", entityId: invoice.id, type: "invoice.created", description: `Invoice created from quote ${quote.quote_number}` });
  redirect(`/invoices/${invoice.id}`);
}

export async function createInvoiceAction(formData: FormData) {
  const { workspace, user, role } = await requireWorkspace("staff");
  if (role === "staff") throw new Error("Staff cannot create invoices.");
  const supabase = await createClient();
  const items = parseItemsFromFormData(formData);
  if (!items.length) redirect("/invoices/new?error=At least one item required");

  const totals = calculateRevenueTotals({ items, discountAmount: Number(formData.get("discount_amount") ?? 0), taxAmount: Number(formData.get("tax_amount") ?? 0) });
  const dueDate = String(formData.get("due_date") ?? "").trim() || null;
  const status = computeInvoiceStatus({ status: String(formData.get("status") ?? "draft"), dueDate, totalAmount: totals.total, paidAmount: 0 });
  const quoteId = String(formData.get("quote_id") ?? "").trim() || null;
  const dealId = String(formData.get("deal_id") ?? "").trim() || null;
  const clientId = String(formData.get("client_id") ?? "").trim() || null;
  const linkError = await validateRevenueLinks(supabase, workspace.id, { quoteId, dealId, clientId });
  if (linkError) redirect(`/invoices/new?error=${encodeURIComponent(linkError)}`);

  const { data: invoiceNumberData, error: invoiceNumberError } = await supabase.rpc("next_document_number", { target_workspace: workspace.id, target_doc_type: "invoice" });
  if (invoiceNumberError) throw invoiceNumberError;

  const { data: invoice, error } = await supabase.from("invoices").insert({
    workspace_id: workspace.id,
    invoice_number: invoiceNumberData,
    quote_id: quoteId,
    deal_id: dealId,
    client_id: clientId,
    status,
    issue_date: String(formData.get("issue_date") ?? new Date().toISOString().slice(0, 10)),
    due_date: dueDate,
    subtotal: totals.subtotal,
    discount_amount: totals.discountAmount,
    tax_amount: totals.taxAmount,
    total_amount: totals.total,
    paid_amount: 0,
    balance_amount: totals.total,
    notes: String(formData.get("notes") ?? "").trim() || null,
    created_by: user.id,
  }).select("id").single();
  if (error || !invoice) redirect(`/invoices/new?error=${encodeURIComponent(error?.message ?? "Unable to create invoice")}`);

  await supabase.from("invoice_items").insert(totals.items.map((item, index) => ({
    workspace_id: workspace.id,
    invoice_id: invoice.id,
    position: index + 1,
    description: item.description,
    quantity: item.quantity,
    unit_price: item.unitPrice,
    line_total: item.lineTotal,
    notes: item.notes ?? null,
  })));

  await logActivity({ workspaceId: workspace.id, actorUserId: user.id, entityType: "invoice", entityId: invoice.id, type: "invoice.created", description: `Invoice created: ${invoiceNumberData}` });
  if (status === "issued") await logActivity({ workspaceId: workspace.id, actorUserId: user.id, entityType: "invoice", entityId: invoice.id, type: "invoice.issued", description: "Invoice issued" });
  redirect(`/invoices/${invoice.id}`);
}

export async function updateInvoiceAction(invoiceId: string, formData: FormData) {
  const { workspace, user, role } = await requireWorkspace("staff");
  if (role === "staff") throw new Error("Staff cannot update invoices.");

  const supabase = await createClient();
  const items = parseItemsFromFormData(formData);
  if (!items.length) redirect(`/invoices/${invoiceId}/edit?error=At least one item required`);

  const totals = calculateRevenueTotals({ items, discountAmount: Number(formData.get("discount_amount") ?? 0), taxAmount: Number(formData.get("tax_amount") ?? 0) });
  const dueDate = String(formData.get("due_date") ?? "").trim() || null;

  const { data: invoiceCurrent } = await supabase.from("invoices").select("paid_amount").eq("workspace_id", workspace.id).eq("id", invoiceId).single();
  const paidAmount = Number(invoiceCurrent?.paid_amount || 0);

  const status = computeInvoiceStatus({ status: String(formData.get("status") ?? "draft"), dueDate, totalAmount: totals.total, paidAmount });
  const quoteId = String(formData.get("quote_id") ?? "").trim() || null;
  const dealId = String(formData.get("deal_id") ?? "").trim() || null;
  const clientId = String(formData.get("client_id") ?? "").trim() || null;
  const linkError = await validateRevenueLinks(supabase, workspace.id, { quoteId, dealId, clientId });
  if (linkError) redirect(`/invoices/${invoiceId}/edit?error=${encodeURIComponent(linkError)}`);

  const { error } = await supabase.from("invoices").update({
    quote_id: quoteId,
    deal_id: dealId,
    client_id: clientId,
    status,
    issue_date: String(formData.get("issue_date") ?? new Date().toISOString().slice(0, 10)),
    due_date: dueDate,
    subtotal: totals.subtotal,
    discount_amount: totals.discountAmount,
    tax_amount: totals.taxAmount,
    total_amount: totals.total,
    balance_amount: Math.max(0, totals.total - paidAmount),
    notes: String(formData.get("notes") ?? "").trim() || null,
    updated_at: new Date().toISOString(),
  }).eq("workspace_id", workspace.id).eq("id", invoiceId);
  if (error) redirect(`/invoices/${invoiceId}/edit?error=${encodeURIComponent(error.message)}`);

  await supabase.from("invoice_items").delete().eq("workspace_id", workspace.id).eq("invoice_id", invoiceId);
  await supabase.from("invoice_items").insert(totals.items.map((item, index) => ({
    workspace_id: workspace.id,
    invoice_id: invoiceId,
    position: index + 1,
    description: item.description,
    quantity: item.quantity,
    unit_price: item.unitPrice,
    line_total: item.lineTotal,
    notes: item.notes ?? null,
  })));

  await logActivity({ workspaceId: workspace.id, actorUserId: user.id, entityType: "invoice", entityId: invoiceId, type: "invoice.updated", description: "Invoice updated" });
  redirect(`/invoices/${invoiceId}`);
}

export async function generatePaymentLinkAction(invoiceId: string) {
  const { workspace, user, role } = await requireWorkspace("staff");
  if (role === "staff") throw new Error("Staff cannot generate payment links.");

  const supabase = await createClient();
  const { data: invoice } = await supabase.from("invoices").select("id, invoice_number, total_amount, balance_amount").eq("workspace_id", workspace.id).eq("id", invoiceId).single();
  if (!invoice) throw new Error("Invoice not found");

  const txRef = `clientpad-${workspace.id.slice(0, 8)}-${invoiceId.slice(0, 8)}-${Date.now()}`;
  const amount = Number(invoice.balance_amount || invoice.total_amount || 0);

  const response = await fetch("https://api.flutterwave.com/v3/payments", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      tx_ref: txRef,
      amount,
      currency: "NGN",
      redirect_url: `${process.env.NEXT_PUBLIC_APP_URL}/invoices/${invoiceId}`,
      payment_options: "card,banktransfer,ussd",
      customer: { name: workspace.name, email: "billing@clientpad.local" },
      customizations: { title: `Invoice ${invoice.invoice_number}`, description: "Payment for ClientPad invoice" },
      meta: { workspace_id: workspace.id, invoice_id: invoiceId },
    }),
  });

  const json = await response.json();
  if (!response.ok || !json?.data?.link) redirect(`/invoices/${invoiceId}?error=Unable to generate payment link`);

  await supabase.from("invoices").update({ flutterwave_payment_link: json.data.link, flutterwave_tx_ref: txRef, status: "issued" }).eq("workspace_id", workspace.id).eq("id", invoiceId);
  await logActivity({ workspaceId: workspace.id, actorUserId: user.id, entityType: "invoice", entityId: invoiceId, type: "payment_link.generated", description: "Flutterwave payment link generated", metadata: { tx_ref: txRef } });

  redirect(`/invoices/${invoiceId}?success=Payment link generated`);
}

export async function recordManualPaymentAction(invoiceId: string, formData: FormData) {
  const { workspace, user, role } = await requireWorkspace("staff");
  if (role === "staff") throw new Error("Staff cannot record payments.");

  const supabase = await createClient();
  const amount = Math.max(0, Number(formData.get("amount") ?? 0));
  if (amount <= 0) redirect(`/invoices/${invoiceId}?error=Payment amount must be greater than 0`);
  const linkError = await validateRevenueLinks(supabase, workspace.id, { invoiceId });
  if (linkError) redirect(`/invoices/${invoiceId}?error=${encodeURIComponent(linkError)}`);

  const { error } = await supabase.from("payments").insert({
    workspace_id: workspace.id,
    invoice_id: invoiceId,
    amount,
    currency: "NGN",
    status: String(formData.get("status") ?? "manually_recorded"),
    method: String(formData.get("method") ?? "bank_transfer"),
    paid_at: String(formData.get("paid_at") ?? "").trim() || new Date().toISOString(),
    transaction_reference: String(formData.get("transaction_reference") ?? "").trim() || null,
    external_reference: `manual-${randomUUID()}`,
    note: String(formData.get("note") ?? "").trim() || null,
    source: "manual",
    created_by: user.id,
  });
  if (error) redirect(`/invoices/${invoiceId}?error=${encodeURIComponent(error.message)}`);

  const updated = await refreshInvoiceAmounts(workspace.id, invoiceId);
  await logActivity({ workspaceId: workspace.id, actorUserId: user.id, entityType: "payment", entityId: invoiceId, type: "payment.recorded", description: `Manual payment recorded: NGN ${amount}` });
  await logActivity({ workspaceId: workspace.id, actorUserId: user.id, entityType: "invoice", entityId: invoiceId, type: updated.status === "paid" ? "invoice.paid" : "invoice.partially_paid", description: `Invoice payment status updated: ${updated.status}` });

  redirect(`/invoices/${invoiceId}?success=Payment recorded`);
}

export async function updatePaymentSettingsAction(formData: FormData) {
  const { workspace, role } = await requireWorkspace("staff");
  if (role === "staff") throw new Error("Staff cannot update payment settings.");

  const supabase = await createClient();
  const payload = {
    workspace_id: workspace.id,
    flutterwave_public_key: String(formData.get("flutterwave_public_key") ?? "").trim() || null,
    bank_instruction: String(formData.get("bank_instruction") ?? "").trim() || null,
    quote_default_terms: String(formData.get("quote_default_terms") ?? "").trim() || null,
    invoice_default_terms: String(formData.get("invoice_default_terms") ?? "").trim() || null,
    task_placeholders: String(formData.get("task_placeholders") ?? "")
      .split("\n")
      .map((value) => value.trim())
      .filter(Boolean),
    reminder_placeholders: String(formData.get("reminder_placeholders") ?? "")
      .split("\n")
      .map((value) => value.trim())
      .filter(Boolean),
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("workspace_payment_settings").upsert(payload);
  if (error) redirect(`/settings?error=${encodeURIComponent(error.message)}`);
  redirect("/settings?success=Payment settings updated");
}
