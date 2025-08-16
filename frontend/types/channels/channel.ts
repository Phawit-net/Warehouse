type PlatformFormData = {
  channel_name: string;
  store_desc: string;
  platform: string;
  platform_tier_id: number;
};

type PlatfromTier = {
  commission_percent: number;
  id: number;
  name: string;
  transaction_percent: number;
};

type Channel = {
  channel_name: string;
  commission_percent: number;
  id: number;
  platform_name: string;
  platform_tier_name: string;
  store_desc: string;
  transaction_percent: number;
};
