"use client";
import useSWR, { mutate } from "swr";
import { fetcher } from "@/lib/fetcher";
import { useParams } from "next/navigation";
import Image from "next/image";
import { DatePicker } from "@/components/DatePicker";
import { salesOrderHeaderColumn } from "@/constant";
import axios from "axios";
import Form from "@/feature/sale/component/Form";
import Table from "@/feature/sale/component/Table";
import { useRef, useState } from "react";
import BackButton from "@/components/BackButton";

const StockInPage = () => {
  const params = useParams<{ id: string }>();
  const [formCollapsed, setFormCollapsed] = useState(false);
  const formRef = useRef<HTMLDivElement | null>(null);

  const { data: product, error: productError } = useSWR<Products>(
    params?.id ? `http://localhost:5001/api/inventory/${params.id}` : null,
    fetcher
  );

  const {
    data,
    error: saleOrderError,
    mutate: salesOrderMutate,
  } = useSWR(
    params?.id ? `http://localhost:5001/api/sale/${params.id}` : null,
    fetcher
  );

  const saleOrder = data?.data ?? [];

  const { data: salesChannel, mutate: salesChannelMutate } = useSWR<
    SalesChannel[]
  >(`http://localhost:5001/api/channel`, fetcher);

  if (productError)
    return (
      <div className="p-6 text-red-400">เกิดข้อผิดพลาดในการโหลดข้อมูล</div>
    );
  if (!product) return <div className="p-6 text-gray-400">ไม่พบสินค้า</div>;

  const main_image = product.images.find(
    (i: { is_main: boolean }) => i.is_main === true
  );
  const imageUrl = main_image
    ? `http://127.0.0.1:5001/api/inventory/uploads/${main_image.filename}`
    : "";

  const handleDelete = async (id: number) => {
    console.log(id);
    try {
      await axios.delete(`http://localhost:5001/api/sale/${id}`);
      salesOrderMutate();
    } catch (error) {
      console.error("❌ Failed to delete:", error);
    }
  };

  return (
    <div ref={formRef} className="min-h-dvh p-6">
      <div className="flex justify-between items-center my-3">
        <h2 className="text-3xl font-semibold">ขายสินค้า : {product.name}</h2>
        <BackButton text="Back to Inventory" fallback="/inventory" />
        {/* <button
          type="submit"
          form="add-sale-order-form"
          className="bg-[#f49b50] text-white p-2 rounded"
        >
          Save
        </button> */}
      </div>
      <section
        className={`transition-[grid-template-rows] duration-300 grid rounded-sm ${
          formCollapsed
            ? "grid-rows-[0fr] border-0 ring-white p-0"
            : "grid-rows-[1fr] border-1 p-5"
        }`}
      >
        <div className="overflow-hidden">
          <div className="grid grid-cols-[auto_1fr] gap-5 ">
            <div className="relative w-[250px] h-[250px] border border-gray-200 rounded-sm">
              <Image
                className="object-contain p-2"
                priority={true}
                src={imageUrl}
                alt="Product"
                fill
                sizes="auto"
              />
            </div>
            <Form
              variantsOption={product.variants}
              product={product}
              salesChannel={salesChannel ?? []}
              salesOrderMutate={salesOrderMutate}
            />
          </div>
        </div>
      </section>

      {/* ✅ หัวส่วนตาราง + ปุ่มย่อ/ขยายฟอร์ม */}
      <div
        className={`${
          formCollapsed ? "mt-0" : "mt-4"
        } flex items-center justify-between`}
      >
        <h3 className="text-lg font-medium">ประวัติการขาย</h3>
        <button
          type="button"
          aria-expanded={!formCollapsed}
          onClick={() => setFormCollapsed((v) => !v)}
          className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
          title={formCollapsed ? "แสดงฟอร์ม" : "ซ่อนฟอร์ม"}
        >
          {formCollapsed ? "แสดงฟอร์ม" : "ซ่อนฟอร์ม"}
          <svg
            viewBox="0 0 20 20"
            className={`size-4 transition ${formCollapsed ? "rotate-180" : ""}`}
            aria-hidden="true"
          >
            <path
              d="M6 8l4 4 4-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      <div className="mt-3">
        {saleOrderError && saleOrder ? (
          <div className="text-red-500">โหลดข้อมูลผิดพลาด</div>
        ) : (saleOrder ?? []).length > 0 ? (
          <Table
            headerColumns={salesOrderHeaderColumn}
            data={saleOrder ?? []}
            handleDelete={handleDelete}
          />
        ) : (
          <div className="text-center text-gray-500 py-10">
            ไม่มีสินค้าที่จะแสดง
          </div>
        )}
      </div>
    </div>
  );
};

export default StockInPage;
