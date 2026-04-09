import { NextResponse } from "next/server";
import { requireWorkspace } from "@/lib/rbac/permissions";
import { getInvoice } from "@/lib/db/revenue";
import { getWorkspaceById } from "@/lib/db/workspace";
import { generateDocumentPdf } from "@/lib/revenue/pdf";
import { getPaymentSettings } from "@/lib/db/revenue";

export async function GET(_request: Request, { params }: { params: Promise<{ invoiceId: string }> }) {
  const { workspace } = await requireWorkspace();
  const { invoiceId } = await params;

  const [invoiceData, workspaceData, paymentSettings] = await Promise.all([
    getInvoice(workspace.id, invoiceId),
    getWorkspaceById(workspace.id),
    getPaymentSettings(workspace.id),
  ]);

  const bytes = await generateDocumentPdf({
    type: "INVOICE",
    workspaceName: workspaceData.name,
    workspacePhone: workspaceData.phone,
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
    termsOrInstructions: paymentSettings?.bank_instruction ?? null,
  });

  return new NextResponse(bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${invoiceData.invoice.invoice_number}.pdf"`,
    },
  });
}
