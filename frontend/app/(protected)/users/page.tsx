"use client";
import React, { useCallback } from "react";
import AddButton from "@/components/PrimaryButton";

const UserPage = () => {
  return (
    <main className="min-h-screen">
      <div className="flex">
        <div className="flex-grow p-10 w-6/7">
          <div className="flex items-end justify-between mb-4">
            <h1 className="text-2xl font-bold">สมาชิก</h1>
            <AddButton
              text={"เพิ่มสมาชิก"}
              handleClick={() => console.log("CLICK Open MODAL")}
            />
          </div>
          {/* {error ? (
            <div className="text-red-500">โหลดข้อมูลผิดพลาด</div>
          ) : isLoading ? (
            <div className="text-gray-500">กำลังโหลดข้อมูล...</div>
          ) : products.length > 0 ? (
            <Table
              headerColumns={headerColumns}
              data={products}
              handleDelete={handleDelete}
            />
          ) : (
            <div className="text-center text-gray-500 py-10">
              ไม่มีสินค้าที่จะแสดง
            </div>
          )} */}
          {/* <Pagination
            currentPage={pagination.page}
            limit={pagination.limit}
            total={pagination.total}
            totalPages={pagination.total_pages}
            onPageChange={handlePageChange}
            onLimitChange={handleLimitChange}
          /> */}
        </div>
      </div>
    </main>
  );
};

export default UserPage;
