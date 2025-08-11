import { DatePicker } from "@/components/DatePicker";
import React, { useCallback, useState } from "react";
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
import axios from "axios";
import { formatISO } from "date-fns";

type Props = {
  variantsOption: Variants[];
  productId: number;
  onSuccess: () => void; // เพิ่ม props นี้
};

type StockInForm = {
  created_at: Date;
  note: string;
  entries: {
    variant_id: number;
    quantity: number;
  }[];
  custom_sale_mode?: string;
  custom_quantity?: number;
  custom_pack_size?: number;
  order_image: File | null;
};

const Form = ({ variantsOption, productId, onSuccess }: Props) => {
  const [selectSwitch, setSelectSwitch] = useState(true);
  const [manualSwitch, setManualSwitch] = useState(false);
  const [orderPreviewUrl, setOrderPreviewUrl] = useState<string | null>(null);

  const activeVariantsOption = variantsOption.filter((v) => v.is_active);

  const {
    reset,
    register,
    handleSubmit,
    control,
    watch,
    getValues,
    setValue,
    formState: { errors },
  } = useForm<StockInForm>({
    defaultValues: {
      created_at: new Date(),
      entries: [
        {
          variant_id: activeVariantsOption[0]?.id,
        },
      ],
      order_image: null,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "entries",
  });

  const selectedVariants = watch("entries")?.map((r) => r.variant_id) || [];
  const availableOptions = activeVariantsOption.filter(
    (variant) => !selectedVariants.includes(variant.id)
  );

  const orderImageFile = watch("order_image");

  const buildFormData = useCallback(
    (data: StockInForm): FormData => {
      const formData = new FormData();

      const stockInEntries = data.entries;
      if (manualSwitch) {
        stockInEntries.push({
          custom_sale_mode: data.custom_sale_mode,
          custom_pack_size: data.custom_pack_size ?? 1,
          quantity: data.custom_quantity ?? 0,
        } as any);
      }

      formData.append("product_id", productId.toString());
      formData.append("created_at", formatISO(data.created_at));
      formData.append("note", data.note);
      if (data.order_image) {
        formData.append("order_image", data.order_image);
      }
      formData.append("entries", JSON.stringify(stockInEntries));
      return formData;
    },
    [manualSwitch]
  );

  const onSubmit: SubmitHandler<StockInForm> = async (data: StockInForm) => {
    console.log("submit", data);
    const formData = buildFormData(data);
    try {
      await axios.post("http://localhost:5001/api/stock-in", formData);
      reset();
      onSuccess();
    } catch (error) {
      console.error("❌ Upload failed:", error);
      // TODO: Add toast / error UI
    }
  };

  const onImageChange = useCallback(
    (file: File | null) => setValue("order_image", file),
    [setValue]
  );

  const onImageRemove = useCallback(() => {
    setOrderPreviewUrl(null);
  }, []);

  return (
    <form id="add-stockin-form" onSubmit={handleSubmit(onSubmit)}>
      <div className="grid grid-cols-[1fr_1fr] gap-3">
        <div className="flex flex-col">
          <Controller
            name="created_at"
            control={control}
            render={({ field }) => (
              <DatePicker label="วันที่รับเข้า" field={field} />
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
                      watch("entries")?.map((r) => r.variant_id) || [];
                    const currentValue = getValues(
                      `entries.${index}.variant_id`
                    );
                    const selectOptions = activeVariantsOption.filter(
                      (v) =>
                        !otherSelected.includes(v.id) || v.id === currentValue
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
                              variant_id: nextOption.id,
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
                    name="custom_sale_mode"
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
                    name="custom_pack_size"
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
            onChange={onImageChange}
            imagePreview={orderPreviewUrl || ""}
            onRemovePreview={onImageRemove}
          />
          <TextArea
            name="note"
            label="หมายเหตุเพิ่มเติม (ถ้ามี)"
            margin={0}
            register={register}
            placeholder=""
          />
        </div>
      </div>
    </form>
  );
};

export default Form;
