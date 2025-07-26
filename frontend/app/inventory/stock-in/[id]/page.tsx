"use client";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { useParams } from "next/navigation";

const StockInPage = () => {
  const params = useParams<{ id: string }>();

  const { data: product, error } = useSWR(
    params?.id ? `http://localhost:5001/api/inventory/${params.id}` : null,
    fetcher
  );

  if (error)
    return (
      <div className="p-6 text-red-400">เกิดข้อผิดพลาดในการโหลดข้อมูล</div>
    );
  if (!product) return <div className="p-6 text-gray-400">ไม่พบสินค้า</div>;

  return (
    <main className="min-h-screen">
      <div className="flex">
        <div className="flex-grow p-10 w-6/7">
          <div className="flex items-end justify-between mb-4">
            <h1 className="text-2xl font-bold">
              รับเข้าสินค้า : {product.name}
            </h1>
          </div>
        </div>
      </div>
    </main>
  );
};

export default StockInPage;
