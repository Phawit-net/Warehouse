"use client";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { useParams } from "next/navigation";
import Image from "next/image";
import { DatePicker } from "@/components/DatePicker";
import Form from "@/feature/stockIn/component/Form";

const StockInPage = () => {
  const params = useParams<{ id: string }>();

  const { data: product, error } = useSWR<Products>(
    params?.id ? `http://localhost:5001/api/inventory/${params.id}` : null,
    fetcher
  );

  if (error)
    return (
      <div className="p-6 text-red-400">เกิดข้อผิดพลาดในการโหลดข้อมูล</div>
    );
  if (!product) return <div className="p-6 text-gray-400">ไม่พบสินค้า</div>;
  console.log(product);

  const main_image = product.images.find(
    (i: { is_main: boolean }) => i.is_main === true
  );
  const imageUrl = main_image
    ? `http://127.0.0.1:5001/api/inventory/uploads/${main_image.filename}`
    : "";

  return (
    <main className="min-h-screen">
      <div className="flex">
        <div className="flex-grow p-10 w-6/7">
          <div className="flex items-end justify-between mb-4">
            <h1 className="text-2xl font-bold">
              รับเข้าสินค้า : {product.name}
            </h1>
          </div>
          <div className="grid grid-cols-[auto_1fr] gap-3">
            <div className="relative w-[250px] h-[250px] border border-gray-300 rounded-xl">
              <Image
                className="object-contain p-2"
                priority={true}
                src={imageUrl}
                alt="Product"
                fill
                sizes="auto"
              />
            </div>
            <Form variantsOption={product.variants} />
          </div>
        </div>
      </div>
    </main>
  );
};

export default StockInPage;
