"use client";
import { useFormContext, Controller } from "react-hook-form";
import TextInput from "@/components/TextInput";
import ToggleSwitch from "@/components/ToggleSwitch";
import React, { Dispatch, SetStateAction } from "react";

type VariantFieldProps = {
  index: number;
  remove: (index?: number | number[]) => void;
  fieldsLength: number;
  mode: "add" | "edit";
  setModalState: Dispatch<
    SetStateAction<{
      show: boolean;
      message: string;
      variantId: number | null;
      variantIndex: number | null;
    }>
  >;
};

const VariantField = React.memo(
  ({ index, remove, fieldsLength, mode, setModalState }: VariantFieldProps) => {
    const { register, watch, control } = useFormContext();
    const isActive = watch(`variants.${index}.is_active`);
    return (
      <div
        className={`p-3 items-center grid ${
          fieldsLength > 1
            ? mode === "edit"
              ? "grid-cols-[1fr_1fr_1fr_1fr_0.3fr_0.1fr]"
              : "grid-cols-[1fr_1fr_1fr_1fr_0.1fr]"
            : mode === "edit"
            ? "grid-cols-[1fr_1fr_1fr_1fr_0.3fr]"
            : "grid-cols-[1fr_1fr_1fr_1fr]"
        } gap-3 [&:not(:last-child)]:border-b-1 `}
      >
        <TextInput
          label=""
          isLabel={false}
          margin={0}
          type="text"
          placeholder="รูปแบบการขาย"
          name={`variants.${index}.sale_mode`}
          register={register}
          disabled={!isActive}
        />
        <TextInput
          label=""
          isLabel={false}
          margin={0}
          placeholder="จำนวนต่อแพ็ค"
          name={`variants.${index}.pack_size`}
          register={register}
          type="number"
          disabled={!isActive}
        />
        <TextInput
          label=""
          isLabel={false}
          margin={0}
          placeholder="ราคาขาย"
          name={`variants.${index}.selling_price`}
          register={register}
          type="number"
          disabled={!isActive}
        />
        <TextInput
          label=""
          isLabel={false}
          margin={0}
          type="text"
          placeholder="SKU ต่อท้าย"
          name={`variants.${index}.sku_suffix`}
          register={register}
          disabled={!isActive}
        />
        {mode === "edit" && (
          <Controller
            name={`variants.${index}.is_active`}
            control={control}
            render={({ field }) => (
              <div className="flex justify-center gap-3">
                <ToggleSwitch enabled={field.value} onChange={field.onChange} />
                <label>{isActive ? "Active" : "Inactive"}</label>
              </div>
            )}
          />
        )}
        {fieldsLength > 1 && (
          <div className="flex items-center">
            <button
              type="button"
              className="text-red-500"
              onClick={() => {
                if (mode === "add") {
                  remove(index);
                } else {
                  const variantId = watch(`variants.${index}.id`);
                  if (variantId) {
                    setModalState({
                      show: true,
                      message: `คุณต้องการลบ Variant ID: ${variantId} นี้หรือไม่?`,
                      variantId,
                      variantIndex: index,
                    });
                  } else {
                    remove(index);
                  }
                }
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
                className="size-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                />
              </svg>
            </button>
          </div>
        )}
      </div>
    );
  }
);

export default VariantField;
