"use client";
import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import type { AxiosResponse } from "axios";
import AddButton from "@/components/PrimaryButton";
import { headerColumns } from "@/constant";
import { useRouter, usePathname } from "next/navigation";
import TableDiv from "@/feature/newProduct/component/TableDiv";
import { Pagination } from "@/components/Pagination";

const ITEMS_PER_PAGE = 3;

export default function InventoryPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [products, setProducts] = useState<Products[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 10,
    total_pages: 1,
  });

  const handleClick = useCallback(() => {
    router.push(`${pathname}/add`);
  }, []);

  const fetchData = useCallback(async (page: number, limit: number) => {
    try {
      const res: AxiosResponse<{
        data: Products[];
        pagination: Pagination;
      }> = await axios.get(
        `http://localhost:5001/api/inventory?page=${page}&limit=${limit}`
      );
      const { data, pagination } = res.data;
      setProducts(data);
      setPagination(pagination);
    } catch (err) {
      console.error("❌ Failed to fetch data:", err);
    }
  }, []);

  useEffect(() => {
    fetchData(pagination.page, pagination.limit);
  }, []);

  const handlePageChange = (newPage: number) => {
    fetchData(newPage, pagination.limit);
  };

  const handleLimitChange = (newLimit: number) => {
    fetchData(1, newLimit); // reset to first page
  };

  const handleDelete = async (id: number) => {
    try {
      await axios.delete(`http://localhost:5001/api/inventory/${id}`);
      setProducts((prev) => prev.filter((p) => p.id !== id));
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
          {products.length > 0 ? (
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
