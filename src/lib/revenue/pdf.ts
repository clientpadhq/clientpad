import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

type Item = {
  description: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  notes?: string | null;
};

function formatNaira(value: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 2,
  }).format(value || 0);
}

export async function generateDocumentPdf(params: {
  type: "QUOTE" | "INVOICE";
  workspaceName: string;
  workspacePhone?: string | null;
  workspaceEmail?: string | null;
  workspaceAddress?: string | null;
  workspaceWebsiteOrSocial?: string | null;
  logoUrl?: string | null;
  footerText?: string | null;
  clientName?: string | null;
  clientPhone?: string | null;
  number: string;
  issueDate: string;
  dueOrValidityDate?: string | null;
  items: Item[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paidAmount?: number;
  balanceAmount?: number;
  notes?: string | null;
  termsOrInstructions?: string | null;
}) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const draw = (text: string, x: number, y: number, size = 10, bold = false) => {
    page.drawText(text, { x, y, size, font: bold ? fontBold : font, color: rgb(0.1, 0.1, 0.1) });
  };

  if (params.logoUrl) {
    try {
      const response = await fetch(params.logoUrl);
      if (response.ok) {
        const logoBytes = await response.arrayBuffer();
        const isPng = params.logoUrl.toLowerCase().includes(".png");
        const embeddedLogo = isPng ? await pdfDoc.embedPng(logoBytes) : await pdfDoc.embedJpg(logoBytes);
        const ratio = embeddedLogo.width / embeddedLogo.height;
        const logoHeight = 36;
        const logoWidth = logoHeight * ratio;
        page.drawImage(embeddedLogo, { x: 40, y: 796, width: logoWidth, height: logoHeight });
      }
    } catch {
      // optional branding asset; silently continue when unreachable or invalid
    }
  }

  draw("ClientPad", 40, 800, 16, true);
  draw(params.workspaceName, 40, 785, 11, true);
  if (params.workspacePhone) draw(params.workspacePhone, 40, 770);
  if (params.workspaceEmail) draw(params.workspaceEmail, 40, 756);
  if (params.workspaceWebsiteOrSocial) draw(params.workspaceWebsiteOrSocial, 40, 742);
  if (params.workspaceAddress) draw(params.workspaceAddress.slice(0, 80), 40, 728, 9);

  draw(params.type, 470, 800, 16, true);
  draw(`No: ${params.number}`, 420, 785, 10, true);
  draw(`Issue: ${params.issueDate}`, 420, 770);
  if (params.dueOrValidityDate) {
    draw(`${params.type === "QUOTE" ? "Valid Until" : "Due Date"}: ${params.dueOrValidityDate}`, 420, 755);
  }

  draw("Bill To", 40, 700, 11, true);
  draw(params.clientName ?? "N/A", 40, 685);
  if (params.clientPhone) draw(params.clientPhone, 40, 670);

  let y = 640;
  draw("Description", 40, y, 10, true);
  draw("Qty", 330, y, 10, true);
  draw("Unit Price", 380, y, 10, true);
  draw("Line Total", 480, y, 10, true);
  y -= 14;

  params.items.forEach((item) => {
    draw(item.description.slice(0, 48), 40, y);
    draw(String(item.quantity), 330, y);
    draw(formatNaira(item.unit_price), 380, y);
    draw(formatNaira(item.line_total), 480, y);
    y -= 14;
    if (item.notes) {
      draw(`Note: ${item.notes.slice(0, 60)}`, 40, y, 9);
      y -= 12;
    }
  });

  y -= 10;
  draw(`Subtotal: ${formatNaira(params.subtotal)}`, 380, y);
  y -= 14;
  draw(`Discount: ${formatNaira(params.discount)}`, 380, y);
  y -= 14;
  draw(`Tax: ${formatNaira(params.tax)}`, 380, y);
  y -= 14;
  draw(`Total: ${formatNaira(params.total)}`, 380, y, 11, true);

  if (params.type === "INVOICE") {
    y -= 20;
    draw(`Paid: ${formatNaira(params.paidAmount || 0)}`, 380, y);
    y -= 14;
    draw(`Balance: ${formatNaira(params.balanceAmount || 0)}`, 380, y, 11, true);
  }

  y -= 30;
  if (params.notes) {
    draw("Notes", 40, y, 11, true);
    y -= 14;
    draw(params.notes.slice(0, 120), 40, y);
    y -= 20;
  }

  if (params.termsOrInstructions) {
    draw(params.type === "QUOTE" ? "Terms" : "Payment Instructions", 40, y, 11, true);
    y -= 14;
    draw(params.termsOrInstructions.slice(0, 140), 40, y);
  }

  draw(params.footerText ?? "Thank you for your business.", 40, 36, 9);

  return await pdfDoc.save();
}
