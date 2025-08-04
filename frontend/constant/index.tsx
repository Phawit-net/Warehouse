export const headerColumns: HeaderColumn[] = [
  { header: "image", accessor: "images", type: "image", width: "[5%]" },
  { header: "SKU", accessor: "sku", type: "display", width: "[9%]" },
  { header: "ชื่อสินค้า", accessor: "name", type: "display", width: "[41%]" },
  {
    header: "หมวดหมู่",
    accessor: "category",
    type: "display",
    width: "[9%]",
  },
  { header: "หน่วยนับ", accessor: "unit", type: "display", width: "[9%]" },
  {
    header: "ราคาต้นทุน",
    accessor: "cost_price",
    type: "display",
    width: "[9%]",
  },
  {
    header: "จำนวนคงเหลือ",
    accessor: "stock",
    type: "display",
    width: "[9%]",
  },
  { header: "Action", accessor: "action", type: "action", width: "[9%]" },
];

export const stockInHeaderColumn: HeaderColumn[] = [
  {
    header: "วันที่รับเข้า",
    accessor: "created_at",
    type: "display",
    width: "[5%]",
  },
  {
    header: "จำนวนรับเข้า",
    accessor: "total_unit",
    type: "display",
    width: "[5%]",
  },
  {
    header: "รายการรับเข้า",
    accessor: "entries",
    type: "display",
    width: "[5%]",
  },
  {
    header: "หลักฐาน",
    accessor: "image",
    type: "image",
    width: "[5%]",
  },
  {
    header: "หมายเหตุเพิ่มเติม",
    accessor: "note",
    type: "display",
    width: "[5%]",
  },
  { header: "Action", accessor: "action", type: "action", width: "[9%]" },
];

export const productData: TableData[] = [
  {
    name: "Vitamin C",
    sku: "001-1PC",
    category: "Vitamin",
    unit: "กล่อง",
    saleType: "box",
    saleAmount: 100,
    costPrice: 2000,
    sellPrice: 35000,
    remainingAmount: 10,
  },
  {
    name: "Vitamin B",
    sku: "002-S",
    category: "Vitamin",
    unit: "กล่อง",
    saleType: "single",
    saleAmount: 1,
    costPrice: 15,
    sellPrice: 50,
    remainingAmount: 10,
  },
];
