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

// export const headerColumns: HeaderColumn[] = [
//   { header: "", accessor: "image", type: "display" },
//   { header: "SKU", accessor: "sku", type: "display" },
//   { header: "ชื่อสินค้า", accessor: "name", type: "display" },
//   { header: "หมวดหมู่", accessor: "category", type: "display" },
//   { header: "หน่วยนับ", accessor: "unit", type: "display" },
//   { header: "ราคาต้นทุน", accessor: "cost_price", type: "display" },
//   { header: "รูปแบบการขาย", accessor: "sale_mode", type: "select" },
//   { header: "จำนวนการขาย", accessor: "pack_size", type: "select" },
//   { header: "ราคาขาย", accessor: "selling_price", type: "select" },
//   { header: "จำนวนคงเหลือ", accessor: "stock", type: "select" },
//   { header: "Action", accessor: "action", type: "action" },
// ];

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
