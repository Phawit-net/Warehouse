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
  sale_date: Date;
  customer_name: string;
  province: string;
  variant_id: number;
  quantity: number;
  sale_price: number;
  channel_id: number;
  shipping_fee: number;
  platform_discount: number;
  shop_discount: number;
  coin_discount: number;
};
