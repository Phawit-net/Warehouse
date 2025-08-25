"use client";
import { useFormContext } from "react-hook-form";
import TextInput from "@/components/TextInput";
import React from "react";

const CustomField = React.memo(() => {
  const { register } = useFormContext();
  return (
    <div className="grid grid-cols-[1fr_1fr_1fr] gap-3 p-3">
      <TextInput
        placeholder="ชื่อ"
        name="custom_sale_mode"
        label=""
        isLabel={false}
        margin={0}
        register={register}
        type="text"
      />
      <TextInput
        placeholder="จำนวน"
        name="custom_quantity"
        label=""
        isLabel={false}
        margin={0}
        register={register}
        type="number"
      />
      <TextInput
        placeholder="ขนาดแพ็ค"
        name="custom_pack_size"
        label=""
        isLabel={false}
        register={register}
        margin={0}
        type="number"
      />
    </div>
  );
});

export default CustomField;
