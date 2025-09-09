"use client";
import Form from "@/feature/product/component/Form";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { useParams } from "next/navigation";
import BackButton from "@/components/BackButton";

const EditPage = () => {
  const params = useParams<{ id: string }>();

  const { data: product, error } = useSWR<Products>(
    `http://localhost:5001/api/inventory/${params.id}`,
    fetcher
  );

  if (error)
    return (
      <div className="p-6 text-red-400">เกิดข้อผิดพลาดในการโหลดข้อมูล</div>
    );
  if (!product) return <div className="p-6 text-gray-400">ไม่พบสินค้า</div>;

  return (
    <div className="bg-[#f7f7f7] min-h-dvh p-6">
      <div className="flex justify-between items-center my-3">
        <h2 className="text-3xl font-semibold">แก้ไขสินค้า</h2>
        <BackButton text="Back to Inventory" fallback="/inventory" />
      </div>
      <Form mode="edit" initialData={product} />
    </div>
  );
};

export default EditPage;
