import Form from "@/feature/saleChannel/component/Form";
import React from "react";

const SaleChannelPage = () => {
  return (
    <main className="min-h-screen">
      <div className="flex">
        <div className="flex-grow p-10 w-6/7">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">ตั้งค่าช่องทางการขาย</h1>
            <button
              type="button"
              form="add-s-form"
              className="bg-[#f49b50] text-white p-2 rounded"
            >
              Save
            </button>
          </div>
          <Form />
        </div>
      </div>
    </main>
  );
};

export default SaleChannelPage;
