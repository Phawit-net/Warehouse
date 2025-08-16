type StockInForm = {
  created_at: Date;
  expiry_date: Date;
  lot_number: string;
  note: string;
  entries: {
    variant_id: number;
    quantity: number;
  }[];
  custom_sale_mode?: string;
  custom_quantity?: number;
  custom_pack_size?: number;
  order_image: File | null;
};
