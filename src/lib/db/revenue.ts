import { createClient } from "@/lib/supabase/server";
import type { Invoice, Quote } from "@/types/database";

export async function listQuotes(workspaceId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("quotes")
    .select("*, client:clients(id,business_name), deal:deals(id,title)")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getQuote(workspaceId: string, quoteId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("quotes")
    .select("*, client:clients(id,business_name,primary_contact,phone,email,location), deal:deals(id,title)")
    .eq("workspace_id", workspaceId)
    .eq("id", quoteId)
    .single();
  if (error) throw error;

  const { data: items, error: itemError } = await supabase
    .from("quote_items")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("quote_id", quoteId)
    .order("position", { ascending: true });
  if (itemError) throw itemError;

  return { quote: data as Quote, items: items ?? [] };
}

export async function listInvoices(workspaceId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("invoices")
    .select("*, client:clients(id,business_name), deal:deals(id,title)")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getInvoice(workspaceId: string, invoiceId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("invoices")
    .select("*, client:clients(id,business_name,primary_contact,phone,email,location), deal:deals(id,title)")
    .eq("workspace_id", workspaceId)
    .eq("id", invoiceId)
    .single();
  if (error) throw error;

  const { data: items, error: itemError } = await supabase
    .from("invoice_items")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("invoice_id", invoiceId)
    .order("position", { ascending: true });
  if (itemError) throw itemError;

  const { data: payments, error: paymentError } = await supabase
    .from("payments")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("invoice_id", invoiceId)
    .order("created_at", { ascending: false });
  if (paymentError) throw paymentError;

  return { invoice: data as Invoice, items: items ?? [], payments: payments ?? [] };
}

export async function getRevenueMetrics(workspaceId: string) {
  const supabase = await createClient();

  const [quotesData, invoicesData] = await Promise.all([
    supabase.from("quotes").select("id,status").eq("workspace_id", workspaceId),
    supabase
      .from("invoices")
      .select("id,status,total_amount,paid_amount,balance_amount,due_date")
      .eq("workspace_id", workspaceId),
  ]);

  if (quotesData.error) throw quotesData.error;
  if (invoicesData.error) throw invoicesData.error;

  const quotes = quotesData.data ?? [];
  const invoices = invoicesData.data ?? [];
  const today = new Date().toISOString().slice(0, 10);

  return {
    totalQuotes: quotes.length,
    quotesSent: quotes.filter((q) => q.status === "sent").length,
    activeInvoices: invoices.filter((i) => i.status === "issued" || i.status === "partially_paid" || i.status === "overdue").length,
    unpaidInvoices: invoices.filter((i) => Number(i.balance_amount || 0) > 0 && i.status !== "cancelled").length,
    overdueInvoices: invoices.filter((i) => i.due_date && i.due_date < today && Number(i.balance_amount || 0) > 0).length,
    totalInvoicedAmount: invoices.reduce((sum, i) => sum + Number(i.total_amount || 0), 0),
    totalPaidAmount: invoices.reduce((sum, i) => sum + Number(i.paid_amount || 0), 0),
    outstandingBalance: invoices.reduce((sum, i) => sum + Number(i.balance_amount || 0), 0),
  };
}

export async function getPaymentSettings(workspaceId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workspace_payment_settings")
    .select("*")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (error) throw error;
  return data;
}
