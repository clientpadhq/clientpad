export function LineItemsFields({
  items,
}: {
  items?: Array<{ description: string; quantity: number; unit_price: number; notes?: string | null }>;
}) {
  const fallback = Array.from({ length: 5 }).map((_, idx) => ({
    description: items?.[idx]?.description ?? "",
    quantity: items?.[idx]?.quantity ?? 1,
    unit_price: items?.[idx]?.unit_price ?? 0,
    notes: items?.[idx]?.notes ?? "",
  }));

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-slate-700">Line items</p>
      {fallback.map((item, index) => (
        <div key={index} className="grid grid-cols-1 gap-2 rounded border border-slate-200 p-2 md:grid-cols-12">
          <input className="md:col-span-5" name="item_description" placeholder="Description" defaultValue={item.description} />
          <input className="md:col-span-2" type="number" min="0" step="0.01" name="item_quantity" placeholder="Qty" defaultValue={item.quantity} />
          <input className="md:col-span-3" type="number" min="0" step="0.01" name="item_unit_price" placeholder="Unit price" defaultValue={item.unit_price} />
          <input className="md:col-span-2" name="item_notes" placeholder="Note" defaultValue={item.notes ?? ""} />
        </div>
      ))}
    </div>
  );
}
