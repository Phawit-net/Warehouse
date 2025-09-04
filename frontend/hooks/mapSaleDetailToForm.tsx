// ---- helper ----
const safeNumber = (v: any, d = 0) =>
  typeof v === "number" && Number.isFinite(v) ? v : d;
const safeInt = (v: any, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : d;
};

// ---- mapper ----
export function mapSaleDetailToForm(
  detail: SaleDetail,
  opts?: { fallbackVariantId?: number; fallbackChannelId?: number }
): SalesForm {
  console.log("DETAIL", detail);
  const item = detail.item ?? null;
  const totals = detail.totals ?? ({} as SaleDetail["totals"]);

  // บาง API ส่งค่าต้นฉบับอยู่ที่ root ด้วย แต่ที่คุณใช้เรามี totals เป็นแหล่งจริง
  const shipping = safeNumber(totals?.shipping_fee, 0);
  const platDisc = safeNumber(totals?.platform_discount, 0);
  const shopDisc = safeNumber(totals?.shop_discount, 0);
  const coinDisc = safeNumber(totals?.coin_discount, 0);

  const variantId =
    (item?.variant_id as number | undefined) ??
    (opts?.fallbackVariantId as number | undefined) ??
    0;

  const channelId =
    (detail.channel?.id as number | undefined) ??
    (opts?.fallbackChannelId as number | undefined) ??
    0;

  // unit_price_at_sale: ใช้จาก item ถ้ามี; ถ้าเผื่อไม่มี ลองคำนวณจาก line_total/qty
  const unitPrice =
    typeof item?.unit_price_at_sale === "number"
      ? item!.unit_price_at_sale
      : item && item.quantity_pack
      ? safeNumber(item.line_total / item.quantity_pack, 0)
      : 0;

  return {
    sale_date: detail.sale_date ? new Date(detail.sale_date) : new Date(),
    customer_name: detail.customer_name ?? "",
    province: detail.province ?? "",
    variant_id: safeInt(variantId, 0),
    quantity_pack: safeInt(item?.quantity_pack, 0),
    unit_price_at_sale: safeNumber(unitPrice, 0),
    channel_id: safeInt(channelId, 0),
    shipping_fee: shipping,
    platform_discount: platDisc,
    shop_discount: shopDisc,
    coin_discount: coinDisc,
    // ถ้าฟอร์มมี note: ใส่เพิ่มได้เลย
    // note: detail.note ?? "",
  };
}
