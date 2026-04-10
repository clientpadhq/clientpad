import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { ExportButton } from "@/components/ui/export-button";
import { StatusBadge } from "@/components/revenue/status-badge";
import { requireWorkspace } from "@/lib/rbac/permissions";
import { listInvoices } from "@/lib/db/revenue";
import { formatNaira } from "@/lib/revenue/calculations";
type InvoiceListRow = { client?: { business_name: string | null } | null };

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { workspace } = await requireWorkspace();
  const [invoices, params] = await Promise.all([listInvoices(workspace.id), searchParams]);

  const exportParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string" && value.trim()) exportParams.set(key, value);
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Invoices"
        description="Track billing and payment collection."
        action={
          <div className="flex items-center gap-2">
            <ExportButton href={`/api/exports/invoices${exportParams.toString() ? `?${exportParams.toString()}` : ""}`} />
            <Link href="/invoices/new" className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white">New invoice</Link>
          </div>
        }
      />

      {invoices.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">No invoices yet.</div>
      ) : (
        <ul className="space-y-2">
          {invoices.map((invoice) => {
            const row = invoice as typeof invoice & InvoiceListRow;
            return (
            <li key={invoice.id} className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <Link href={`/invoices/${invoice.id}`} className="font-medium text-slate-900">{invoice.invoice_number}</Link>
                <StatusBadge status={invoice.status} />
              </div>
              <p className="text-sm text-slate-600">{row.client?.business_name ?? "No client"}</p>
              <p className="text-xs text-slate-500">{formatNaira(Number(invoice.total_amount))} • Balance {formatNaira(Number(invoice.balance_amount))}</p>
            </li>
          );})}
        </ul>
      )}
    </div>
  );
}
