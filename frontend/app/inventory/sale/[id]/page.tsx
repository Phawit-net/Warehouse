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

const StockInPage = () => {
  const params = useParams<{ id: string }>();

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

  console.log("saleOrder", saleOrder);

  return (
    <main className="min-h-screen">
      <div className="flex">
        <div className="flex-grow p-10 w-6/7">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">ขายสินค้า : {product.name}</h1>
            <button
              type="submit"
              form="add-sale-order-form"
              className="bg-[#f49b50] text-white p-2 rounded"
            >
              Save
            </button>
          </div>

          <div className="grid grid-cols-[auto_1fr] gap-3 border-b-1 border-gray-200 pb-5 ">
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
            <Form
              variantsOption={product.variants}
              product={product}
              salesChannel={salesChannel ?? []}
              salesOrderMutate={salesOrderMutate}
            />
          </div>
          <div>
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
      </div>
    </main>
  );
};

export default StockInPage;
