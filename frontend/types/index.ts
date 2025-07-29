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

type Pagination = {
  limit: number;
  page: number;
  total: number;
  total_pages: number;
};

type Variants = {
  pack_size: number;
  sale_mode: string;
  selling_price: number;
  sku_suffix: string;
};
