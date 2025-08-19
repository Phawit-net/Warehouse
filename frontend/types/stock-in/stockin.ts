type StockInForm = {
  created_at: Date;
  expiry_date?: Date | null;
  doc_number?: string;
  lot_number: string;
  note: string;
  entries: {
    variant_id: number | null;
    quantity: number;
    custom_sale_mode?: string | null;
    custom_pack_size?: number | null;
    pack_size_at_receipt?: number | null;
    lot_number?: string | null;
  }[];
  custom_sale_mode?: string;
  custom_quantity?: number;
  custom_pack_size?: number;
  order_image: File | null;
};
