"use client";
import { useFormContext, Controller } from "react-hook-form";
import TextInput from "@/components/TextInput";
import React from "react";
import Select from "./Select";

type VariantFieldProps = {
  index: number;
  remove: (index?: number | number[]) => void;
  fieldsLength: number;
  selectOptions: Variants[];
};

const VariantField = React.memo(
  ({ index, remove, fieldsLength, selectOptions }: VariantFieldProps) => {
    const { register, watch, control } = useFormContext();
    return (
      <div
        className={`p-3 items-center grid ${
          fieldsLength > 1
            ? "grid-cols-[1fr_1fr_0.05fr]"
            : "grid-cols-[1fr_1fr]"
        } gap-3 [&:not(:last-child)]:border-b-1 `}
      >
        <Controller
          name={`entries.${index}.variant_id`}
          control={control}
          render={({ field }) => (
            <Select
              options={selectOptions}
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
        <TextInput
          label=""
          isLabel={false}
          margin={0}
          placeholder="จำนวน"
          name={`entries.${index}.quantity`}
          register={register}
          type="number"
        />
        {fieldsLength > 1 && (
          <div className="flex items-center">
            <button
              type="button"
              className="text-red-500"
              onClick={() => {
                remove(index);
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
