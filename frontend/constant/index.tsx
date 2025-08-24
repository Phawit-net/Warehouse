export const headerColumns: HeaderColumn[] = [
  { header: "image", accessor: "images", type: "image" },
  { header: "SKU", accessor: "sku", type: "display" },
  { header: "ชื่อสินค้า", accessor: "name", type: "display" },
  {
    header: "หมวดหมู่",
    accessor: "category",
    type: "display",
  },
  { header: "หน่วยนับ", accessor: "unit", type: "display" },
  {
    header: "ราคาต้นทุน",
    accessor: "cost_price",
    type: "display",
  },
  {
    header: "จำนวนคงเหลือ",
    accessor: "stock",
    type: "display",
  },
  { header: "Action", accessor: "action", type: "action" },
];

export const stockInHeaderColumn: HeaderColumn[] = [
  {
    header: "วันที่รับเข้า",
    accessor: "created_at",
    type: "display",
  },
  {
    header: "เลขล็อต",
    accessor: "lot_numbers",
    type: "display",
  },
  {
    header: "จำนวนรับเข้า",
    accessor: "total_unit",
    type: "display",
  },
  {
    header: "รายการรับเข้า",
    accessor: "entries",
    type: "display",
  },
  {
    header: "วันหมดอายุ",
    accessor: "expiry_date",
    type: "display",
  },
  {
    header: "หลักฐาน",
    accessor: "image",
    type: "image",
  },
  {
    header: "หมายเหตุเพิ่มเติม",
    accessor: "note",
    type: "display",
  },
  { header: "Action", accessor: "action", type: "action" },
];

export const salesChannelHeaderColumn: HeaderColumn[] = [
  {
    header: "ชื่อช่องทาง",
    accessor: "channel_name",
    type: "display",
  },
  {
    header: "ค่าธรรมเนียมการขาย (%)",
    accessor: "commission_percent",
    type: "display",
  },
  {
    header: "ค่าธุรกรรมการชำระเงิน (%)",
    accessor: "transaction_percent",
    type: "display",
  },
  { header: "", accessor: "action", type: "action" },
];

export const salesOrderHeaderColumn: HeaderColumn[] = [
  {
    header: "วันที่ขาย",
    accessor: "sale_date",
    type: "display",
  },
  {
    header: "ชื่อลูกค้า",
    accessor: "customer_name",
    type: "display",
  },
  {
    header: "ช่องทาง",
    accessor: "channel_name_at_sale",
    type: "display",
  },
  {
    header: "ขนาดการขาย",
    accessor: "pack_size_at_sale",
    type: "display",
  },
  {
    header: "จำนวน",
    accessor: "quantity_pack",
    type: "display",
  },
  {
    header: "หน่วย",
    accessor: "sale_mode_at_sale",
    type: "display",
  },
  {
    header: "ราคาขายสุทธิ",
    accessor: "subtotal",
    type: "display",
  },
  {
    header: "ส่วนลดร้าน",
    accessor: "shop_discount",
    type: "display",
  },
  {
    header: "ส่วนลด Platform",
    accessor: "platform_discount",
    type: "display",
  },
  {
    header: "ส่วนลด Coin",
    accessor: "coin_discount",
    type: "display",
  },
  {
    header: "ยอดลูกค้าชำระ",
    accessor: "customer_pay",
    type: "display",
  },
  {
    header: "ยอดรับจริง",
    accessor: "seller_receive",
    type: "display",
  },
  { header: "จัดการ", accessor: "action", type: "action" },
];
