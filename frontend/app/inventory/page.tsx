"use client";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { useCallback, useState } from "react";
import axios from "axios";
import AddButton from "@/components/PrimaryButton";
import { headerColumns } from "@/constant";
import { useRouter, usePathname } from "next/navigation";
import TableDiv from "@/feature/newProduct/component/TableDiv";
import { Pagination } from "@/components/Pagination";

export default function InventoryPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const { data, error, mutate, isLoading } = useSWR(
    `http://localhost:5001/api/inventory?page=${page}&limit=${limit}`,
    fetcher
  );

  const products = data?.data ?? [];
  const pagination = data?.pagination ?? {
    page,
    limit,
    total: 0,
    total_pages: 1,
  };

  const handleClick = useCallback(() => {
    router.push(`${pathname}/add`);
  }, []);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    setPage(1); // reset page
  };

  const handleDelete = async (id: number) => {
    try {
      await axios.delete(`http://localhost:5001/api/inventory/${id}`);
      mutate(); // refresh data after delete
    } catch (error) {
      console.error("❌ Failed to delete:", error);
    }
  };

  return (
    <main className="min-h-screen">
      <div className="flex">
        <div className="flex-grow p-10 w-6/7">
          <div className="flex items-end justify-between mb-4">
            <h1 className="text-2xl font-bold">Inventory</h1>
            <AddButton text={"Add Inventory"} handleClick={handleClick} />
          </div>
          {error ? (
            <div className="text-red-500">โหลดข้อมูลผิดพลาด</div>
          ) : isLoading ? (
            <div className="text-gray-500">กำลังโหลดข้อมูล...</div>
          ) : products.length > 0 ? (
            <TableDiv headerColumns={headerColumns} data={products} />
          ) : (
            <div className="text-center text-gray-500 py-10">
              ไม่มีสินค้าที่จะแสดง
            </div>
          )}
          <Pagination
            currentPage={pagination.page}
            limit={pagination.limit}
            total={pagination.total}
            totalPages={pagination.total_pages}
            onPageChange={handlePageChange}
            onLimitChange={handleLimitChange}
          />
        </div>
        <div className="w-1/7 min-w-[100px] bg-gray-50  h-screen "></div>
      </div>
    </main>
  );
}
