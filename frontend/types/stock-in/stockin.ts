type StockInForm = {
  created_at: Date;
  expiry_date?: Date | null;
  doc_number?: string;
  lot_number: string;
  note: string;
  entries: {
    variant_id: number;
    quantity?: number | null;
    custom_quantity?: number | null;
    custom_sale_mode?: string | null;
    custom_pack_size?: number | null;
    pack_size_at_receipt?: number | null;
    lot_number?: string | null;
  }[];
  custom_sale_mode?: string;
  custom_quantity?: number | null;
  custom_pack_size?: number | null;
  order_image: File | null;
};

type StockInDetail = {
  created_at: Date;
  expiry_date?: Date | null;
  doc_number?: string;
  lot_number: string;
  note: string;
  image_filename: string;
  entries: {
    batch_id: number;
    custom_pack_size?: number | null;
    custom_sale_mode?: string | null;
    entry_id: number;
    pack_size_at_receipt?: number | null;
    quantity: number;
    total_unit: number;
    lot_number: string;
    variant_id: number | null;
    variant_label: string;
  }[];
  lots: {
    batch_id: number;
    expiry_date?: Date | null;
    lot_number: string;
    qty_received: number;
    qty_remaining: number;
  }[];
};
