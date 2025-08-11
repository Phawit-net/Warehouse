"use client";
import Form from "@/feature/product/component/Form";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { useParams } from "next/navigation";

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
    <div className="bg-[#fff0e4] h-full p-3 ">
      <div className="flex justify-between items-center my-3">
        <h2 className="text-3xl font-semibold mx-3">แก้ไขสินค้า</h2>
        <button
          type="submit"
          form="add-product-form"
          className="bg-[#f49b50] text-white p-2 rounded"
        >
          Save & Publish
        </button>
      </div>
      <Form mode="edit" initialData={product} />
    </div>
  );
};

export default EditPage;
