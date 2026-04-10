import { NextResponse } from "next/server";
import { requireWorkspace } from "@/lib/rbac/permissions";
import { getQuote } from "@/lib/db/revenue";
import { getWorkspaceBrandingSettings, getWorkspaceById } from "@/lib/db/workspace";
import { generateDocumentPdf } from "@/lib/revenue/pdf";

type QuoteClient = { business_name: string | null; phone: string | null };
type QuoteItem = { description: string; quantity: number; unit_price: number; line_total: number; notes?: string | null };

export async function GET(_request: Request, { params }: { params: Promise<{ quoteId: string }> }) {
  const { workspace } = await requireWorkspace();
  const { quoteId } = await params;

  const [quoteData, workspaceData, brandingSettings] = await Promise.all([
    getQuote(workspace.id, quoteId),
    getWorkspaceById(workspace.id),
    getWorkspaceBrandingSettings(workspace.id),
  ]);

  const quote = quoteData.quote as typeof quoteData.quote & { client?: QuoteClient | null };
  const bytes = await generateDocumentPdf({
    type: "QUOTE",
    workspaceName: workspaceData.name,
    workspacePhone: workspaceData.phone,
    workspaceEmail: brandingSettings?.email ?? null,
    workspaceAddress: brandingSettings?.address ?? null,
    workspaceWebsiteOrSocial: brandingSettings?.website_or_social ?? null,
    logoUrl: brandingSettings?.logo_url ?? null,
    footerText: brandingSettings?.default_footer_text ?? null,
    clientName: (quoteData.quote as any).client?.business_name,
    clientPhone: (quoteData.quote as any).client?.phone,
    number: quoteData.quote.quote_number,
    issueDate: quoteData.quote.issue_date,
    dueOrValidityDate: quoteData.quote.valid_until,
    items: quoteData.items as any,
    subtotal: Number(quoteData.quote.subtotal),
    discount: Number(quoteData.quote.discount_amount),
    tax: Number(quoteData.quote.tax_amount),
    total: Number(quoteData.quote.total_amount),
    notes: quoteData.quote.notes,
    termsOrInstructions: quoteData.quote.terms ?? brandingSettings?.default_quote_terms ?? null,
    clientName: quote.client?.business_name,
    clientPhone: quote.client?.phone,
    number: quote.quote_number,
    issueDate: quote.issue_date,
    dueOrValidityDate: quote.valid_until,
    items: quoteData.items as QuoteItem[],
    subtotal: Number(quote.subtotal),
    discount: Number(quote.discount_amount),
    tax: Number(quote.tax_amount),
    total: Number(quote.total_amount),
    notes: quote.notes,
    termsOrInstructions: quote.terms,
  });

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${quote.quote_number}.pdf"`,
    },
  });
}
