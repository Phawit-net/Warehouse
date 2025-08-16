import Form from "@/feature/saleChannel/component/Form";
import React from "react";

const page = () => {
  return (
    <div className="bg-[#fff0e4] h-full p-3 ">
      <div className="flex justify-between items-center my-3">
        <h2 className="text-3xl font-semibold mx-3">เพิ่มร้านค้า</h2>
      </div>
      <Form />
    </div>
  );
};

export default page;
