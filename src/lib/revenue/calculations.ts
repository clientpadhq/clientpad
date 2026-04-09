export type RevenueItemInput = {
  description: string;
  quantity: number;
  unitPrice: number;
  notes?: string;
};

export function parseItemsFromFormData(formData: FormData): RevenueItemInput[] {
  const descriptions = formData.getAll("item_description").map(String);
  const quantities = formData.getAll("item_quantity").map((v) => Number(v || 0));
  const unitPrices = formData.getAll("item_unit_price").map((v) => Number(v || 0));
  const notes = formData.getAll("item_notes").map(String);

  return descriptions
    .map((description, index) => ({
      description: description.trim(),
      quantity: Number.isFinite(quantities[index]) ? quantities[index] : 0,
      unitPrice: Number.isFinite(unitPrices[index]) ? unitPrices[index] : 0,
      notes: notes[index]?.trim() || undefined,
    }))
    .filter((item) => item.description && item.quantity > 0);
}

export function calculateRevenueTotals({
  items,
  discountAmount,
  taxAmount,
}: {
  items: RevenueItemInput[];
  discountAmount: number;
  taxAmount: number;
}) {
  const normalizedDiscount = Math.max(0, Number(discountAmount || 0));
  const normalizedTax = Math.max(0, Number(taxAmount || 0));

  const detailedItems = items.map((item) => {
    const quantity = Math.max(0, Number(item.quantity || 0));
    const unitPrice = Math.max(0, Number(item.unitPrice || 0));
    const lineTotal = quantity * unitPrice;
    return { ...item, quantity, unitPrice, lineTotal };
  });

  const subtotal = detailedItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const total = Math.max(0, subtotal - normalizedDiscount + normalizedTax);

  return {
    items: detailedItems,
    subtotal,
    discountAmount: normalizedDiscount,
    taxAmount: normalizedTax,
    total,
  };
}

export function computeInvoiceStatus({
  status,
  dueDate,
  totalAmount,
  paidAmount,
}: {
  status: string;
  dueDate?: string | null;
  totalAmount: number;
  paidAmount: number;
}) {
  if (status === "cancelled") return "cancelled";
  if (paidAmount >= totalAmount && totalAmount > 0) return "paid";
  if (paidAmount > 0 && paidAmount < totalAmount) return "partially_paid";
  if (dueDate) {
    const nowDate = new Date().toISOString().slice(0, 10);
    if (dueDate < nowDate && paidAmount < totalAmount) return "overdue";
  }
  return status === "draft" ? "draft" : "issued";
}

export function formatNaira(value: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 2,
  }).format(value || 0);
}
