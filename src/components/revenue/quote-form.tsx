import type { QuoteStatus } from "@/types/database";
import { LineItemsFields } from "@/components/revenue/line-items-fields";

const statuses: QuoteStatus[] = ["draft", "sent", "accepted", "rejected", "expired"];

type QuoteFormQuote = {
  client_id: string | null;
  deal_id: string | null;
  issue_date: string;
  valid_until: string | null;
  status: QuoteStatus;
  discount_amount: number;
  tax_amount: number;
  notes: string | null;
  terms: string | null;
};

export function QuoteForm({
  action,
  clients,
  deals,
  quote,
  items,
}: {
  action: (formData: FormData) => void;
  clients: Array<{ id: string; business_name: string }>;
  deals: Array<{ id: string; title: string }>;
  quote?: QuoteFormQuote;
  items?: Array<{ description: string; quantity: number; unit_price: number; notes?: string | null }>;
}) {
  return (
    <form action={action} className="space-y-3">
      <select name="client_id" defaultValue={quote?.client_id ?? ""} required>
        <option value="">Select client</option>
        {clients.map((client) => (
          <option key={client.id} value={client.id}>{client.business_name}</option>
        ))}
      </select>
      <select name="deal_id" defaultValue={quote?.deal_id ?? ""}>
        <option value="">No linked deal</option>
        {deals.map((deal) => (
          <option key={deal.id} value={deal.id}>{deal.title}</option>
        ))}
      </select>
      <div className="grid gap-3 md:grid-cols-3">
        <input type="date" name="issue_date" defaultValue={quote?.issue_date ?? new Date().toISOString().slice(0, 10)} required />
        <input type="date" name="valid_until" defaultValue={quote?.valid_until?.slice(0, 10) ?? ""} />
        <select name="status" defaultValue={quote?.status ?? "draft"}>
          {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
        </select>
      </div>

      <LineItemsFields items={items} />

      <div className="grid gap-3 md:grid-cols-2">
        <input type="number" min="0" step="0.01" name="discount_amount" placeholder="Discount amount" defaultValue={quote?.discount_amount ?? 0} />
        <input type="number" min="0" step="0.01" name="tax_amount" placeholder="Tax amount" defaultValue={quote?.tax_amount ?? 0} />
      </div>
      <textarea name="notes" placeholder="Notes" defaultValue={quote?.notes ?? ""} rows={3} />
      <textarea name="terms" placeholder="Terms" defaultValue={quote?.terms ?? ""} rows={3} />
      <button className="w-full bg-emerald-600 text-white">Save quote</button>
    </form>
  );
}
