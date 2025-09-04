type SalesChannel = {
  id: number;
  channel_name: string;
  commission_percent: number;
  transaction_percent: number;
};

type Sales = {
  sale_date: Date;
  customer_name: string;
  province: string;
  quantity: number;

  sale_price: number;
  pack_size_at_sale: number;
  sale_mode_at_sale: string;

  shipping_fee: number;
  shop_discount: number;
  platform_discount: number;
  coin_discount: number;

  channel_name_at_sale: string;
  commission_percent_at_sale: number;
  transaction_percent_at_sale: number;

  total_price: number;
  vat_amount: number;
  seller_receive: number;
  customer_pay: number;
  commission_fee: number;
  transaction_fee: number;
};

type SalesForm = {
  sale_date: Date | null;
  customer_name: string;
  province: string;
  variant_id: number | null;
  quantity_pack: number | null;
  unit_price_at_sale: number | null;
  channel_id: number | null;
  shipping_fee: number | null;
  platform_discount: number | null;
  shop_discount: number | null;
  coin_discount: number | null;
};

type SaleDetail = {
  id: number;
  sale_date?: string | null;
  customer_name?: string | null;
  province?: string | null;
  note?: string | null;
  channel?: {
    id: number;
    name: string;
    commission_percent: number;
    transaction_percent: number;
  } | null;
  item?: {
    id: number;
    product_id: number;
    variant_id: number;
    sale_mode_at_sale: string;
    pack_size_at_sale: number;
    quantity_pack: number;
    unit_price_at_sale: number;
    base_units: number;
    line_total: number;
  } | null;
  totals?: {
    subtotal: number;
    shipping_fee: number;
    shop_discount: number;
    platform_discount: number;
    coin_discount: number;
    vat_amount: number;
    commission_fee: number;
    transaction_fee: number;
    customer_pay: number;
    seller_receive: number;
  } | null;
};
