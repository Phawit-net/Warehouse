type HeaderColumn = {
  header: string;
  accessor: string;
  type: "display" | "image" | "action";
};

type TableData = {
  [key: string]: any;
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
