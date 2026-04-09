import { NextResponse } from "next/server";
import { requireWorkspace } from "@/lib/rbac/permissions";
import { getQuote } from "@/lib/db/revenue";
import { getWorkspaceById } from "@/lib/db/workspace";
import { generateDocumentPdf } from "@/lib/revenue/pdf";

export async function GET(_request: Request, { params }: { params: Promise<{ quoteId: string }> }) {
  const { workspace } = await requireWorkspace();
  const { quoteId } = await params;

  const [quoteData, workspaceData] = await Promise.all([
    getQuote(workspace.id, quoteId),
    getWorkspaceById(workspace.id),
  ]);

  const bytes = await generateDocumentPdf({
    type: "QUOTE",
    workspaceName: workspaceData.name,
    workspacePhone: workspaceData.phone,
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
    termsOrInstructions: quoteData.quote.terms,
  });

  return new NextResponse(bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${quoteData.quote.quote_number}.pdf"`,
    },
  });
}
