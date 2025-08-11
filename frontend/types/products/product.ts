type ProductFormData = {
  main_image: File | null;
  other_images: File[];
  name: string;
  sku: string;
  category: string;
  unit: string;
  cost_price: number;
  stock: number;
  variants: Variants[];
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

type Variants = {
  id: number;
  pack_size: number;
  sale_mode: string;
  selling_price: number;
  sku_suffix: string;
  is_active: boolean;
};
