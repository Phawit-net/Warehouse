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
import { formatISO, format } from "date-fns";
import { fmtISODateOrNull, toIntOrNull, toIntOrZero } from "@/lib/format";

type Props = {
  variantsOption: Variants[];
  productId: number;
  onSuccess: () => void; // เพิ่ม props นี้
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

      formData.append("product_id", String(productId));
      formData.append("created_at", formatISO(data.created_at));
      const expiry = fmtISODateOrNull(data.expiry_date);
      if (expiry) formData.append("expiry_date", expiry);
      if (data.note) formData.append("note", data.note);
      if (data.doc_number) formData.append("doc_number", data.doc_number);
      if (data.order_image) formData.append("order_image", data.order_image);

      const headerLot = (data.lot_number ?? "").trim() || null;

      const entries = data.entries.map((e) => ({
        variant_id: e.variant_id, // ผู้ใช้เลือกได้
        quantity: toIntOrZero(e.quantity), // ผู้ใช้กรอกได้
        lot_number: (e.lot_number ?? headerLot) || "",

        // 🔒 ไม่ให้แก้ค่า pack size → ไม่ส่งฟิลด์นี้
        // ให้หลังบ้านไป lookup จาก variant เอง

        // เผื่อกรณี custom (เปิด manualSwitch): ต้องส่งคู่ custom_* เท่านั้น
        custom_sale_mode: null,
        custom_pack_size: null,
      }));

      // ถ้ามี manualSwitch -> push entry custom เพิ่ม
      if (manualSwitch) {
        entries.push({
          variant_id: null,
          quantity: toIntOrZero(data.custom_quantity),
          lot_number: headerLot || "",

          // custom ต้องส่งสองตัวนี้ (ผู้ใช้กรอกได้)
          custom_sale_mode: data.custom_sale_mode ?? null,
          custom_pack_size: data.custom_pack_size ?? null,
        } as any);
      }

      // กรอง entry ที่ quantity <= 0 ออก
      const filtered = entries.filter((e) => e.quantity > 0);
      if (filtered.length === 0) {
        throw new Error("ต้องมีรายการรับเข้าอย่างน้อย 1 แถว (quantity > 0)");
      }

      formData.append("entries", JSON.stringify(filtered));
      return formData;
    },
    [manualSwitch]
  );

  const onSubmit: SubmitHandler<StockInForm> = async (data: StockInForm) => {
    // console.log("submit", data);
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
          <Controller
            name="expiry_date"
            control={control}
            render={({ field }) => (
              <DatePicker label="วันหมดอายุ" field={field} />
            )}
          />
          <TextInput
            label="lot number"
            placeholder="เลข lot"
            name={`lot_number`}
            register={register}
            type="text"
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
