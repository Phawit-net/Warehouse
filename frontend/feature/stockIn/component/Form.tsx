import { DatePicker } from "@/components/DatePicker";
import React, { useState } from "react";
import {
  SubmitHandler,
  Controller,
  useForm,
  useFieldArray,
} from "react-hook-form";
import TextInput from "@/components/TextInput";
import Select from "./Select";
import ToggleSwitch from "@/components/ToggleSwitch";
import { TimerOff } from "lucide-react";
import ToggleSwitchCard from "./ToggleSwitchCard";
import ImageUploader from "@/components/ImageUploader";
import TextArea from "@/components/TextArea";
type Props = {
  variantsOption: Variants[];
};

type FormData = {
  date: Date | undefined;
  receiving: {
    variant: string;
    quantity: number;
  }[];
  custom_variant?: string;
  custom_quantity?: number;
  custom_packSize?: number;
  order_image: File | null;
};

const Form = ({ variantsOption }: Props) => {
  const [selectSwitch, setSelectSwitch] = useState(false);
  const [manualSwitch, setManualSwitch] = useState(false);
  const [orderPreviewUrl, setOrderPreviewUrl] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    watch,
    getValues,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      date: new Date(),
      receiving: [
        {
          variant: variantsOption[0]?.sale_mode,
        },
      ],
      order_image: null,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "receiving",
  });

  const onSubmit: SubmitHandler<FormData> = (data) => {
    const enrichedReceiving = data.receiving.map((item) => {
      const matchedVariant = variantsOption.find(
        (v) => v.sale_mode === item.variant
      );

      return {
        ...item,
        packSize: matchedVariant?.pack_size || null, // หรือ default เป็น 1 ก็ได้
      };
    });

    const finalData = {
      ...data,
      receiving: enrichedReceiving,
    };

    console.log("📦 finalData =>", finalData);
  };

  const selectedVariants = watch("receiving")?.map((r) => r.variant) || [];
  const availableOptions = variantsOption.filter(
    (variant) => !selectedVariants.includes(variant.sale_mode)
  );

  const orderImageFile = watch("order_image");

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="grid grid-cols-[1fr_1fr] gap-3">
        <div className="flex flex-col">
          <Controller
            name="date"
            control={control}
            render={({ field }) => (
              <DatePicker label="วันที่รับเข้า" name="date" field={field} />
            )}
          />
          <div className="flex flex-col gap-1">
            <label className=" text-md font-semibold bg-white px-1">
              เลือกรูปแบบ
            </label>

            <ToggleSwitchCard
              label="การรับเข้าจากรายการขาย"
              isToggle={selectSwitch}
              onChange={setSelectSwitch}
            >
              {selectSwitch && (
                <>
                  {fields.map((field, index) => {
                    const otherSelected =
                      watch("receiving")?.map((r) => r.variant) || [];
                    const currentValue = getValues(
                      `receiving.${index}.variant`
                    );
                    const selectOptions = variantsOption.filter(
                      (v) =>
                        !otherSelected.includes(v.sale_mode) ||
                        v.sale_mode === currentValue
                    );

                    return (
                      <div
                        key={field.id}
                        className={`grid ${
                          fields.length > 1
                            ? "grid-cols-[1fr_1fr_auto]"
                            : "grid-cols-[1fr_1fr]"
                        } gap-3 `}
                      >
                        <Controller
                          name={`receiving.${index}.variant`}
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
                          name={`receiving.${index}.quantity`}
                          register={register}
                          type="number"
                        />

                        {fields.length > 1 && (
                          <div className="flex items-center ">
                            <button
                              type="button"
                              className="text-red-500"
                              onClick={() => remove(index)}
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
                  })}
                  <div className="self-center mt-1 ">
                    <button
                      type="button"
                      onClick={() => {
                        if (availableOptions.length > 0) {
                          const nextOption = availableOptions[0]; // ตัวแรกที่ยังไม่ได้เลือก
                          if (nextOption && nextOption.sale_mode) {
                            append({
                              variant: nextOption.sale_mode,
                              quantity: 0,
                            });
                          }
                        }
                      }}
                      disabled={availableOptions.length === 0}
                      className={`text-[#f49b50] border-2 border-dashed p-2 rounded-lg ${
                        availableOptions.length === 0
                          ? "opacity-50 cursor-not-allowed"
                          : ""
                      }`}
                    >
                      + เพิ่มรูปแบบการขาย
                    </button>
                  </div>
                </>
              )}
            </ToggleSwitchCard>

            <ToggleSwitchCard
              label="เพิ่มรูปแบบใหม่หรือรับเข้าใหม่"
              isToggle={manualSwitch}
              onChange={setManualSwitch}
            >
              {manualSwitch && (
                <div className="grid grid-cols-[1fr_1fr_1fr] gap-3">
                  <TextInput
                    placeholder="ชื่อ"
                    name="custom_variant"
                    label="ชื่อรูปแบบ"
                    margin={0}
                    register={register}
                    type="text"
                  />
                  <TextInput
                    placeholder="จำนวน"
                    name="custom_quantity"
                    label="จำนวนที่รับเข้า"
                    margin={0}
                    register={register}
                    type="number"
                  />
                  <TextInput
                    placeholder="ขนาดแพ็ค"
                    name="custom_packSize"
                    label="จำนวนชิ้นต่อหน่วย"
                    register={register}
                    margin={0}
                    type="number"
                  />
                </div>
              )}
            </ToggleSwitchCard>
          </div>
        </div>
        <div className="flex flex-col">
          <ImageUploader
            label="อัปโหลดใบส่งของ/ใบสั่งซื้อ"
            image={orderImageFile}
            onChange={(file: File | null) => setValue("order_image", file)}
            imagePreview={orderPreviewUrl || ""}
            onRemovePreview={() => {
              setOrderPreviewUrl(null);
            }}
          />
          <TextArea
            name="note"
            label="หมายเหตุเพิ่มเติม (ถ้ามี)"
            margin={0}
            register={register}
            placeholder=""
          />
          <input type="submit" />
        </div>
      </div>
    </form>
  );
};

export default Form;
