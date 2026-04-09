import Link from "next/link";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { ActivityList } from "@/components/ui/activity-list";
import { StatusBadge } from "@/components/revenue/status-badge";
import { requireWorkspace } from "@/lib/rbac/permissions";
import { getQuote } from "@/lib/db/revenue";
import { formatNaira } from "@/lib/revenue/calculations";
import { createClient } from "@/lib/supabase/server";
import { convertQuoteToInvoiceAction } from "@/lib/actions/revenue";
import { WhatsAppShareCard } from "@/components/ai/whatsapp-share-card";

export default async function QuoteDetailPage({ params }: { params: Promise<{ quoteId: string }> }) {
  const { workspace } = await requireWorkspace();
  const { quoteId } = await params;
  const quoteData = await getQuote(workspace.id, quoteId);

  const supabase = await createClient();
  const { data: activities } = await supabase
    .from("activities")
    .select("id,description,created_at,activity_type")
    .eq("workspace_id", workspace.id)
    .eq("entity_type", "quote")
    .eq("entity_id", quoteId)
    .order("created_at", { ascending: false });

  const convertAction = convertQuoteToInvoiceAction.bind(null, quoteId);

  return (
    <div className="space-y-4">
      <PageHeader
        title={quoteData.quote.quote_number}
        description={(quoteData.quote as any).client?.business_name ?? "Quote details"}
        action={<Link href={`/quotes/${quoteId}/edit`} className="rounded-md border border-slate-300 px-4 py-2 text-sm">Edit</Link>}
      />

      <Card title="Quote Summary">
        <div className="space-y-2 text-sm">
          <p>Status: <StatusBadge status={quoteData.quote.status} /></p>
          <p>Issue date: {quoteData.quote.issue_date}</p>
          <p>Valid until: {quoteData.quote.valid_until ?? "-"}</p>
          <p>Total: <span className="font-semibold">{formatNaira(Number(quoteData.quote.total_amount))}</span></p>
        </div>
      </Card>

      <Card title="Line Items">
        <ul className="space-y-2 text-sm">
          {quoteData.items.map((item: any) => (
            <li key={item.id} className="rounded border border-slate-200 p-2">
              <p className="font-medium">{item.description}</p>
              <p className="text-slate-600">{item.quantity} × {formatNaira(Number(item.unit_price))} = {formatNaira(Number(item.line_total))}</p>
            </li>
          ))}
        </ul>
      </Card>

      <div className="grid gap-2 md:flex">
        <a href={`/api/quotes/${quoteId}/pdf`} className="rounded-md bg-slate-800 px-4 py-2 text-center text-sm font-medium text-white">View PDF</a>
        <a href={`/api/quotes/${quoteId}/pdf`} download className="rounded-md border border-slate-300 px-4 py-2 text-center text-sm">Download PDF</a>
        {quoteData.quote.status === "accepted" ? (
          <form action={convertAction}><button className="w-full md:w-auto bg-emerald-600 text-white">Convert to invoice</button></form>
        ) : null}
      </div>


      <Card title="WhatsApp Share">
        <WhatsAppShareCard
          title="Share quote with client"
          phone={(quoteData.quote as any).client?.phone}
          message={`Hello ${(quoteData.quote as any).client?.business_name ?? ""}, please find quote ${quoteData.quote.quote_number} from ${(quoteData.quote as any).client?.business_name ? "ClientPad" : "our team"}. Total: ${formatNaira(Number(quoteData.quote.total_amount))}. View PDF: ${process.env.NEXT_PUBLIC_APP_URL}/api/quotes/${quoteId}/pdf`}
          logPath={JSON.stringify({ workspace_id: workspace.id, entity_type: "quote", entity_id: quoteId, activity_type: "quote.shared", description: "Quote shared via WhatsApp" })}
        />
      </Card>

      <Card title="Activity">
        <ActivityList items={activities ?? []} />
      </Card>
    </div>
  );
}
