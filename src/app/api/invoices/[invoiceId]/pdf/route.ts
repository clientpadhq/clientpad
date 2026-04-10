import { NextResponse } from "next/server";
import { requireWorkspace } from "@/lib/rbac/permissions";
import { getInvoice } from "@/lib/db/revenue";
import { getWorkspaceById } from "@/lib/db/workspace";
import { generateDocumentPdf } from "@/lib/revenue/pdf";
import { getPaymentSettings } from "@/lib/db/revenue";

type InvoiceClient = { business_name: string | null; phone: string | null };
type InvoiceItem = { description: string; quantity: number; unit_price: number; line_total: number; notes?: string | null };

export async function GET(_request: Request, { params }: { params: Promise<{ invoiceId: string }> }) {
  const { workspace } = await requireWorkspace();
  const { invoiceId } = await params;

  const [invoiceData, workspaceData, paymentSettings] = await Promise.all([
    getInvoice(workspace.id, invoiceId),
    getWorkspaceById(workspace.id),
    getPaymentSettings(workspace.id),
  ]);

  const invoice = invoiceData.invoice as typeof invoiceData.invoice & { client?: InvoiceClient | null };
  const bytes = await generateDocumentPdf({
    type: "INVOICE",
    workspaceName: workspaceData.name,
    workspacePhone: workspaceData.phone,
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
