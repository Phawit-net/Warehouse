const toDate = (v: Date | string | null | undefined): Date | undefined =>
  !v ? undefined : v instanceof Date ? v : new Date(v);

export function mapStockinDetailToForm(
  detail: StockInDetail,
  opts?: { fallbackVariantId?: number }
): { values: StockInForm; manualSwitch: boolean } {
  const headerLot = detail.lot_number ?? "";

  const normalEntries: StockInForm["entries"] = detail.entries
    .filter((e) => e.variant_id != null)
    .map((e) => ({
      variant_id: e.variant_id!, // ผ่าน filter แล้ว
      quantity: e.quantity,
      pack_size_at_receipt: e.pack_size_at_receipt ?? null,
      lot_number: e.lot_number ?? headerLot,
    }));

  const customRow = detail.entries.find((e) => e.variant_id == null);

  const values: StockInForm = {
    created_at: toDate(detail.created_at)!,
    expiry_date: toDate(detail.expiry_date) ?? null,
    doc_number: detail.doc_number ?? "",
    lot_number: headerLot,
    note: detail.note ?? "",
    entries:
      normalEntries.length > 0
        ? normalEntries
        : opts?.fallbackVariantId
        ? [
            {
              variant_id: opts.fallbackVariantId,
              quantity: 0,
              pack_size_at_receipt: null,
              lot_number: headerLot,
            },
          ]
        : [],
    ...(customRow
      ? {
          custom_sale_mode: customRow.custom_sale_mode ?? "",
          custom_pack_size: customRow.custom_pack_size ?? undefined,
          custom_quantity: customRow.quantity ?? undefined,
        }
      : {}),
    order_image: null,
  };

  return { values, manualSwitch: !!customRow };
}
