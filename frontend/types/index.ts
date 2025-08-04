type HeaderColumn = {
  header: string;
  accessor: string;
  type: "display" | "image" | "action";
  width: string;
};

type TableData = {
  [key: string]: any;
};

type Products = {
  id: number;
  category: string;
  cost_price: number;
  name: string;
  sku: string;
  stock: number;
  unit: string;
  images: {
    filename: string;
    is_main: boolean;
  }[];
  variants: Variants[];
};

type StockIn = {
  created_at: string;
  entries: Entries[];
  id: number;
  image_filename: string;
  note: string;
  total_unit: number;
};

type Entries = {
  pack_size: number;
  quantity: number;
  sale_mode: string;
  total_unit: number;
};

type Pagination = {
  limit: number;
  page: number;
  total: number;
  total_pages: number;
};

type Variants = {
  id: number;
  pack_size: number;
  sale_mode: string;
  selling_price: number;
  sku_suffix: string;
};

type NewVariants = {
  pack_size: number;
  sale_mode: string;
  selling_price: number;
  sku_suffix: string;
};
