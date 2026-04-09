import Link from "next/link";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { ActivityList } from "@/components/ui/activity-list";
import { StatusBadge } from "@/components/revenue/status-badge";
import { QuickTaskForm } from "@/components/execution/quick-task-form";
import { ReminderList } from "@/components/execution/reminder-list";
import { requireWorkspace } from "@/lib/rbac/permissions";
import { AIGenerateCard } from "@/components/ai/ai-generate-card";
import { AIHistoryList } from "@/components/ai/ai-history-list";
import { listAIGenerations } from "@/lib/db/ai";
import { getInvoice } from "@/lib/db/revenue";
import { formatNaira } from "@/lib/revenue/calculations";
import { createClient } from "@/lib/supabase/server";
import { generatePaymentLinkAction, recordManualPaymentAction } from "@/lib/actions/revenue";

export default async function InvoiceDetailPage({ params, searchParams }: { params: Promise<{ invoiceId: string }>; searchParams: Promise<{ error?: string; success?: string }>; }) {
  const { workspace } = await requireWorkspace();
  const { invoiceId } = await params;
  const query = await searchParams;
  const invoiceData = await getInvoice(workspace.id, invoiceId);

  const generatePaymentLink = generatePaymentLinkAction.bind(null, invoiceId);
  const recordManualPayment = recordManualPaymentAction.bind(null, invoiceId);

  const supabase = await createClient();
  const [aiRows, { data: activities }, { data: reminders }, { data: tasks }] = await Promise.all([
    listAIGenerations(workspace.id, "invoice", invoiceId),
  const [{ data: activities }, { data: reminders }, { data: tasks }] = await Promise.all([
    supabase.from("activities").select("id,description,created_at,activity_type").eq("workspace_id", workspace.id).in("entity_type", ["invoice", "payment", "task", "reminder"]).eq("entity_id", invoiceId).order("created_at", { ascending: false }).limit(16),
    supabase.from("reminders").select("*").eq("workspace_id", workspace.id).eq("related_entity_type", "invoice").eq("related_entity_id", invoiceId).eq("status", "open").order("due_at", { ascending: true }),
    supabase.from("tasks").select("*").eq("workspace_id", workspace.id).eq("related_entity_type", "invoice").eq("related_entity_id", invoiceId).order("due_at", { ascending: true }),
  ]);

  const isOverdue = !!invoiceData.invoice.due_date && invoiceData.invoice.due_date < new Date().toISOString().slice(0, 10) && Number(invoiceData.invoice.balance_amount) > 0;

  return (
    <div className="space-y-4">
      <PageHeader title={invoiceData.invoice.invoice_number} description={(invoiceData.invoice as any).client?.business_name ?? "Invoice details"} action={<Link href={`/invoices/${invoiceId}/edit`} className="rounded-md border border-slate-300 px-4 py-2 text-sm">Edit</Link>} />

      {query.error ? <p className="rounded bg-red-50 p-2 text-sm text-red-700">{query.error}</p> : null}
      {query.success ? <p className="rounded bg-green-50 p-2 text-sm text-green-700">{query.success}</p> : null}

      <Card title="Invoice Summary">
        <div className="space-y-2 text-sm">
          <p>Status: <StatusBadge status={invoiceData.invoice.status} /></p>
          <p>Issue date: {invoiceData.invoice.issue_date}</p>
          <p>Due date: {invoiceData.invoice.due_date ?? "-"} {isOverdue ? <span className="ml-2 rounded bg-red-100 px-2 py-1 text-xs text-red-700">Overdue</span> : null}</p>
          <p>Total: <span className="font-semibold">{formatNaira(Number(invoiceData.invoice.total_amount))}</span></p>
          <p>Paid: {formatNaira(Number(invoiceData.invoice.paid_amount))}</p>
          <p>Balance: {formatNaira(Number(invoiceData.invoice.balance_amount))}</p>
          <div className="pt-2"><Link href={`/jobs/new?invoiceId=${invoiceId}&clientId=${invoiceData.invoice.client_id ?? ""}&dealId=${invoiceData.invoice.deal_id ?? ""}`} className="rounded-md border border-slate-300 px-3 py-1 text-xs">Create job from invoice</Link></div>
        </div>
      </Card>

      <Card title="Invoice Tasks">
        <QuickTaskForm entityType="invoice" entityId={invoiceId} titlePrefix={invoiceData.invoice.invoice_number} />
        <ul className="mt-3 space-y-2 text-sm">{(tasks ?? []).map((task:any)=><li key={task.id} className="rounded border border-slate-200 p-2"><Link href={`/tasks/${task.id}`} className="font-medium">{task.title}</Link><p className="text-slate-600">{task.status} • {task.priority}</p></li>)}</ul>
      </Card>

      <Card title="Invoice Reminders"><ReminderList reminders={reminders ?? []} /></Card>

      <Card title="Line Items">
        <ul className="space-y-2 text-sm">
          {invoiceData.items.map((item: any) => (
            <li key={item.id} className="rounded border border-slate-200 p-2">
              <p className="font-medium">{item.description}</p>
              <p className="text-slate-600">{item.quantity} × {formatNaira(Number(item.unit_price))} = {formatNaira(Number(item.line_total))}</p>
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Payment Collection">
        <div className="space-y-3">
          <form action={generatePaymentLink}><button className="w-full md:w-auto bg-emerald-600 text-white">Generate Flutterwave payment link</button></form>
          {invoiceData.invoice.flutterwave_payment_link ? <div className="rounded border border-slate-200 p-3 text-sm"><p className="font-medium">Payment link</p><a href={invoiceData.invoice.flutterwave_payment_link} target="_blank" className="break-all text-emerald-700 underline">{invoiceData.invoice.flutterwave_payment_link}</a></div> : null}
        </div>
      </Card>

      <Card title="Record Manual Payment">
        <form action={recordManualPayment} className="space-y-2">
          <div className="grid gap-2 md:grid-cols-2"><input type="number" min="0" step="0.01" name="amount" placeholder="Amount" required /><input type="datetime-local" name="paid_at" /></div>
          <div className="grid gap-2 md:grid-cols-2"><input name="method" placeholder="Method" defaultValue="bank_transfer" /><input name="transaction_reference" placeholder="Transaction reference" /></div>
          <select name="status" defaultValue="manually_recorded"><option value="manually_recorded">manually_recorded</option><option value="successful">successful</option><option value="partially_paid">partially_paid</option></select>
          <textarea name="note" placeholder="Note" rows={2} />
          <button className="w-full bg-slate-800 text-white">Add manual payment</button>
        </form>
      </Card>


      <Card title="AI Copilot (Optional)">
        <div className="grid gap-3 md:grid-cols-2">
          <AIGenerateCard
            title="Payment reminder draft"
            description="Generate a polite but firm payment reminder. Review before sending manually."
            generationType="payment_reminder_draft"
            entityType="invoice"
            entityId={invoiceId}
            returnPath={`/invoices/${invoiceId}`}
            context={{ invoice_number: invoiceData.invoice.invoice_number, due_date: invoiceData.invoice.due_date, balance_due: invoiceData.invoice.balance_amount, client: (invoiceData.invoice as any).client?.business_name, status: invoiceData.invoice.status }}
          />
          <AIGenerateCard
            title="Next-step suggestions"
            description="Recommendation-only suggestions for collection and execution follow-up."
            generationType="next_step_suggestion"
            entityType="invoice"
            entityId={invoiceId}
            returnPath={`/invoices/${invoiceId}`}
            context={{ invoice_number: invoiceData.invoice.invoice_number, status: invoiceData.invoice.status, balance_due: invoiceData.invoice.balance_amount, overdue: isOverdue, linked_job_hint: true }}
          />
        </div>
        <div className="mt-3"><AIHistoryList rows={aiRows} /></div>
      </Card>

      <Card title="Payments">
        {invoiceData.payments.length === 0 ? <p className="text-sm text-slate-600">No payments yet.</p> : <ul className="space-y-2 text-sm">{invoiceData.payments.map((payment: any) => <li key={payment.id} className="rounded border border-slate-200 p-2"><div className="flex items-center justify-between"><span>{formatNaira(Number(payment.amount))}</span><StatusBadge status={payment.status} /></div><p className="text-slate-600">{payment.method ?? payment.source} • {payment.paid_at ? new Date(payment.paid_at).toLocaleString() : "-"}</p></li>)}</ul>}
      </Card>

      <div className="grid gap-2 md:flex"><a href={`/api/invoices/${invoiceId}/pdf`} className="rounded-md bg-slate-800 px-4 py-2 text-center text-sm font-medium text-white">View PDF</a><a href={`/api/invoices/${invoiceId}/pdf`} download className="rounded-md border border-slate-300 px-4 py-2 text-center text-sm">Download PDF</a></div>
      <Card title="Activity"><ActivityList items={activities ?? []} /></Card>
    </div>
  );
}
