import { NextResponse } from "next/server";
import { getInvoice, getPaymentSettings } from "@/lib/db/revenue";
import { getWorkspaceBrandingSettings, getWorkspaceById } from "@/lib/db/workspace";
import { requireWorkspace } from "@/lib/rbac/permissions";
import { generateDocumentPdf } from "@/lib/revenue/pdf";

type InvoiceClient = { business_name: string | null; phone: string | null };
type InvoiceItem = { description: string; quantity: number; unit_price: number; line_total: number; notes?: string | null };

export async function GET(_request: Request, { params }: { params: Promise<{ invoiceId: string }> }) {
  const { workspace } = await requireWorkspace();
  const { invoiceId } = await params;

  const [invoiceData, workspaceData, paymentSettings, brandingSettings] = await Promise.all([
    getInvoice(workspace.id, invoiceId),
    getWorkspaceById(workspace.id),
    getPaymentSettings(workspace.id),
    getWorkspaceBrandingSettings(workspace.id),
  ]);

  const invoice = invoiceData.invoice as typeof invoiceData.invoice & { client?: InvoiceClient | null };
  const bytes = await generateDocumentPdf({
    type: "INVOICE",
    workspaceName: workspaceData.name,
    workspacePhone: workspaceData.phone,
    workspaceEmail: brandingSettings?.email ?? null,
    workspaceAddress: brandingSettings?.address ?? null,
    workspaceWebsiteOrSocial: brandingSettings?.website_or_social ?? null,
    logoUrl: brandingSettings?.logo_url ?? null,
    footerText: brandingSettings?.default_footer_text ?? null,
    clientName: invoice.client?.business_name,
    clientPhone: invoice.client?.phone,
    number: invoice.invoice_number,
    issueDate: invoice.issue_date,
    dueOrValidityDate: invoice.due_date,
    items: invoiceData.items as InvoiceItem[],
    subtotal: Number(invoice.subtotal),
    discount: Number(invoice.discount_amount),
    tax: Number(invoice.tax_amount),
    total: Number(invoice.total_amount),
    paidAmount: Number(invoice.paid_amount),
    balanceAmount: Number(invoice.balance_amount),
    notes: invoice.notes,
    termsOrInstructions: paymentSettings?.bank_instruction ?? brandingSettings?.default_invoice_terms ?? null,
  });

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${invoice.invoice_number}.pdf"`,
    },
  });
}
