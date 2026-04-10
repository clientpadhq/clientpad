import type { InvoiceStatus } from "@/types/database";
import { LineItemsFields } from "@/components/revenue/line-items-fields";

const statuses: InvoiceStatus[] = ["draft", "issued", "partially_paid", "paid", "overdue", "cancelled"];

type InvoiceFormInvoice = {
  client_id: string | null;
  deal_id: string | null;
  quote_id: string | null;
  issue_date: string;
  due_date: string | null;
  status: InvoiceStatus;
  discount_amount: number;
  tax_amount: number;
  notes: string | null;
};

export function InvoiceForm({
  action,
  clients,
  deals,
  quotes,
  invoice,
  items,
}: {
  action: (formData: FormData) => void;
  clients: Array<{ id: string; business_name: string }>;
  deals: Array<{ id: string; title: string }>;
  quotes: Array<{ id: string; quote_number: string }>;
  invoice?: InvoiceFormInvoice;
  items?: Array<{ description: string; quantity: number; unit_price: number; notes?: string | null }>;
}) {
  return (
    <form action={action} className="space-y-3">
      <select name="client_id" defaultValue={invoice?.client_id ?? ""} required>
        <option value="">Select client</option>
        {clients.map((client) => (
          <option key={client.id} value={client.id}>{client.business_name}</option>
        ))}
      </select>
      <div className="grid gap-3 md:grid-cols-2">
        <select name="deal_id" defaultValue={invoice?.deal_id ?? ""}>
          <option value="">No linked deal</option>
          {deals.map((deal) => (
            <option key={deal.id} value={deal.id}>{deal.title}</option>
          ))}
        </select>
        <select name="quote_id" defaultValue={invoice?.quote_id ?? ""}>
          <option value="">No linked quote</option>
          {quotes.map((quote) => (
            <option key={quote.id} value={quote.id}>{quote.quote_number}</option>
          ))}
        </select>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <input type="date" name="issue_date" defaultValue={invoice?.issue_date ?? new Date().toISOString().slice(0, 10)} required />
        <input type="date" name="due_date" defaultValue={invoice?.due_date?.slice(0, 10) ?? ""} />
        <select name="status" defaultValue={invoice?.status ?? "draft"}>
          {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
        </select>
      </div>

      <LineItemsFields items={items} />

      <div className="grid gap-3 md:grid-cols-2">
        <input type="number" min="0" step="0.01" name="discount_amount" placeholder="Discount amount" defaultValue={invoice?.discount_amount ?? 0} />
        <input type="number" min="0" step="0.01" name="tax_amount" placeholder="Tax amount" defaultValue={invoice?.tax_amount ?? 0} />
      </div>

      <textarea name="notes" placeholder="Notes" defaultValue={invoice?.notes ?? ""} rows={3} />
      <button className="w-full bg-emerald-600 text-white">Save invoice</button>
    </form>
  );
}
