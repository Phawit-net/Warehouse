"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import AddButton from "@/components/PrimaryButton";
import Table from "@/feature/newProduct/component/Table";
import { headerColumns } from "@/constant";
import { useRouter, usePathname } from "next/navigation";
import TableDiv from "@/feature/newProduct/component/TableDiv";

export default function InventoryPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [products, setProducts] = useState<Products[]>([]);

  useEffect(() => {
    axios
      .get("http://localhost:5001/api/inventory")
      .then((res) => setProducts(res.data))
      .catch((err) => console.error(err));
  }, []);

  const handleClick = () => {
    router.push(`${pathname}/add`);
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
            // <Table
            //   headerColumns={headerColumns}
            //   data={products}
            //   onDelete={handleDelete}
            // />
            <TableDiv headerColumns={headerColumns} data={products} />
          ) : (
            <div className="text-center text-gray-500 py-10">
              ไม่มีสินค้าที่จะแสดง
            </div>
          )}
        </div>
        <div className="w-1/7 min-w-[100px] bg-gray-50  h-screen "></div>
      </div>
    </main>
  );
}
