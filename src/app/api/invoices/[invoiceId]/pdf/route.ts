import { NextResponse } from "next/server";
import { requireWorkspace } from "@/lib/rbac/permissions";
import { getInvoice } from "@/lib/db/revenue";
import { getWorkspaceBrandingSettings, getWorkspaceById } from "@/lib/db/workspace";
import { generateDocumentPdf } from "@/lib/revenue/pdf";
import { getPaymentSettings } from "@/lib/db/revenue";

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
    clientName: (invoiceData.invoice as any).client?.business_name,
    clientPhone: (invoiceData.invoice as any).client?.phone,
    number: invoiceData.invoice.invoice_number,
    issueDate: invoiceData.invoice.issue_date,
    dueOrValidityDate: invoiceData.invoice.due_date,
    items: invoiceData.items as any,
    subtotal: Number(invoiceData.invoice.subtotal),
    discount: Number(invoiceData.invoice.discount_amount),
    tax: Number(invoiceData.invoice.tax_amount),
    total: Number(invoiceData.invoice.total_amount),
    paidAmount: Number(invoiceData.invoice.paid_amount),
    balanceAmount: Number(invoiceData.invoice.balance_amount),
    notes: invoiceData.invoice.notes,
    termsOrInstructions:
      paymentSettings?.bank_instruction ?? brandingSettings?.default_invoice_terms ?? null,
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
    termsOrInstructions: paymentSettings?.bank_instruction ?? null,
  });

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${invoice.invoice_number}.pdf"`,
    },
  });
}
