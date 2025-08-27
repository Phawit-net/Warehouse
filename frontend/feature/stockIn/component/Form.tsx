import { DatePicker } from "@/components/DatePicker";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  SubmitHandler,
  Controller,
  useForm,
  useFieldArray,
  FormProvider,
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
import VariantField from "./VariantField";
import CustomField from "./CustomField";
import SubmitButton from "@/components/SubmitButton";
import { mapDetailToForm } from "@/hooks/mapDetailToForm";

type Props = {
  variantsOption: Variants[];
  productId: number;
  onSuccess: () => void; // เพิ่ม props นี้
  editingId: number | null;
  handleEdit: (id: number | null) => void;
  editingData: StockInDetail | null;
};

const Form = ({
  variantsOption,
  productId,
  onSuccess,
  editingId,
  handleEdit,
  editingData,
}: Props) => {
  const [selectSwitch, setSelectSwitch] = useState(true);
  const [manualSwitch, setManualSwitch] = useState(false);
  const [orderPreviewUrl, setOrderPreviewUrl] = useState<string | null>(null);
  const activeVariantsOption = useMemo(
    () => variantsOption.filter((v) => v.is_active),
    [variantsOption]
  );
  const fallbackVariantId = activeVariantsOption[0]?.id;

  const methods = useForm<StockInForm>({
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

  const {
    reset,
    register,
    handleSubmit,
    control,
    watch,
    getValues,
    setValue,
    resetField,
  } = methods;

  const { fields, append, remove } = useFieldArray({
    control,
    name: "entries",
  });

  const selectedVariants = watch("entries")?.map((r) => r.variant_id) || [];
  const availableOptions = activeVariantsOption.filter(
    (variant) => !selectedVariants.includes(variant.id)
  );

  const orderImageFile = watch("order_image");

  useEffect(() => {
    if (editingId && editingData) {
      const receiptImage = editingData.image_filename;
      setOrderPreviewUrl(
        `http://127.0.0.1:5001/api/stock-in/uploads/receipts/${receiptImage}`
      );

      const { values, manualSwitch } = mapDetailToForm(editingData, {
        fallbackVariantId: fallbackVariantId,
      });
      setManualSwitch(manualSwitch); // เปิดส่วน custom อัตโนมัติถ้ามี
      reset(values); // พรีฟิลทั้งหมด
    }
  }, [editingId, editingData, reset, activeVariantsOption]);

  const createDefaults = useCallback(
    (): StockInForm => ({
      created_at: new Date(),
      expiry_date: null,
      doc_number: "",
      lot_number: "",
      note: "",
      entries: activeVariantsOption[0]
        ? [
            {
              variant_id: activeVariantsOption[0].id,
              quantity: null,
              lot_number: "",
            },
          ]
        : [],
      custom_sale_mode: "",
      custom_pack_size: null,
      custom_quantity: null,
      order_image: null,
    }),
    [activeVariantsOption]
  );

  const handleCancel = () => {
    // ล้างค่าฟอร์มกลับไปค่าเริ่มต้น
    reset(createDefaults(), {
      keepDirty: false,
      keepErrors: false,
      keepTouched: false,
      keepIsSubmitted: false,
      keepSubmitCount: false,
    });

    resetField("custom_pack_size");
    resetField("custom_quantity");
    // ล้าง state อื่น ๆ ที่อยู่นอก RHF
    setManualSwitch(true);
    setSelectSwitch(true);
    setOrderPreviewUrl(null);

    // ล้างไฟล์ในฟิลด์ file (เพราะ input file ไม่รับค่า string ว่าง)
    setValue("order_image", null, {
      shouldDirty: false,
      shouldTouch: false,
      shouldValidate: false,
    });
  };

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
    console.log("submit", data);
    const formData = buildFormData(data);
    formData.forEach((value, key) => {
      console.log(key, value);
    });
    // try {
    //   await axios.post("http://localhost:5001/api/stock-in", formData);
    //   reset();
    //   onSuccess();
    // } catch (error) {
    //   console.error("❌ Upload failed:", error);
    //   // TODO: Add toast / error UI
    // }
  };

  const onImageChange = useCallback(
    (file: File | null) => setValue("order_image", file),
    [setValue]
  );

  const onImageRemove = useCallback(() => {
    setOrderPreviewUrl(null);
  }, []);

  return (
    <FormProvider {...methods}>
      <form id="add-stockin-form" onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-[1fr_1fr] gap-5">
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
              required={true}
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
                    <div className="border-1 border-gray-200 rounded-sm">
                      <div
                        className={`bg-gray-100 rounded-b-none rounded-sm grid gap-3 p-3 ${
                          fields.length > 1
                            ? "grid-cols-[1fr_1fr_0.05fr]"
                            : "grid-cols-[1fr_1fr]"
                        }`}
                      >
                        <span>ขนาด</span>
                        <span>จำนวน</span>
                      </div>
                      {fields.map((field, index) => {
                        const otherSelected =
                          watch("entries")?.map((r) => r.variant_id) || [];
                        const currentValue = getValues(
                          `entries.${index}.variant_id`
                        );
                        const selectOptions = activeVariantsOption.filter(
                          (v) =>
                            !otherSelected.includes(v.id) ||
                            v.id === currentValue
                        );

                        return (
                          <VariantField
                            key={field.id}
                            index={index}
                            remove={remove}
                            fieldsLength={fields.length}
                            selectOptions={selectOptions}
                          />
                        );
                      })}
                    </div>
                    <div className="self-end mt-1 ">
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
                        className={`text-[#f49b50] flex items-center gap-1  ${
                          availableOptions.length === 0
                            ? "opacity-50 cursor-not-allowed"
                            : "cursor-pointer"
                        }`}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth="1.5"
                          stroke="currentColor"
                          className="size-6"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                          />
                        </svg>
                        เพิ่มรูปแบบการขาย
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
                  <div className="border-1 border-gray-200 rounded-sm">
                    <div
                      className={`bg-gray-100 rounded-b-none rounded-sm grid gap-3 p-3 grid-cols-[1fr_1fr_1fr]`}
                    >
                      <span>ชื่อรูปแบบ</span>
                      <span>จำนวนที่รับเข้า</span>
                      <span>จำนวนชิ้นต่อหน่วย</span>
                    </div>
                    <CustomField />
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
        <div className="flex justify-end">
          {editingId ? (
            <div className="flex gap-3">
              <button
                type="button"
                className="bg-[#092C4C] p-2 px-3 text-white flex justify-center items-center justify-items-center gap-2 rounded-sm cursor-pointer"
                onClick={() => {
                  handleCancel();
                  handleEdit(null);
                }}
              >
                <span>Cancel</span>
              </button>
              <SubmitButton text="Save Change" form="add-stockin-form" />
            </div>
          ) : (
            <SubmitButton text="Add Stockin" form="add-stockin-form" />
          )}
        </div>
      </form>
    </FormProvider>
  );
};

export default Form;
