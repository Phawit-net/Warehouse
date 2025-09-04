import { DatePicker } from "@/components/DatePicker";
import React, { useCallback, useEffect, useState } from "react";
import {
  SubmitHandler,
  Controller,
  useForm,
  useFieldArray,
} from "react-hook-form";
import TextInput from "@/components/TextInput";
import ToggleSwitch from "@/components/ToggleSwitch";
import { TimerOff } from "lucide-react";
// import ToggleSwitchCard from "./ToggleSwitchCard";
import ImageUploader from "@/components/ImageUploader";
import TextArea from "@/components/TextArea";
import axios from "axios";
import { formatISO } from "date-fns";
import Modal from "@/components/Modal";
import ChannelModal from "./ChannelModal";
import { KeyedMutator } from "swr";
import ChannelSelect from "./ChannelSelect";
import VariantSelect from "./VariantSelect";
import SubmitButton from "@/components/SubmitButton";
import { mapSaleDetailToForm } from "@/hooks/mapSaleDetailToForm";

type Props = {
  variantsOption: Variants[];
  product: Products;
  salesChannel: SalesChannel[];
  salesOrderMutate: KeyedMutator<any>;
  editingId: number | null;
  handleEdit: (id: number | null) => void;
  editingData: SaleDetail | null;
};

const Form = ({
  variantsOption,
  product,
  salesChannel,
  salesOrderMutate,
  editingId,
  handleEdit,
  editingData,
}: Props) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

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
    resetField,
  } = useForm<SalesForm>({
    defaultValues: {},
  });

  useEffect(() => {
    console.log("editingId", editingId, "editingData", editingData);
    if (editingId && editingData) {
      const values = mapSaleDetailToForm(editingData, {
        fallbackVariantId: variantsOption.find((v) => v.is_active)?.id,
        fallbackChannelId: salesChannel[0]?.id,
      });
      reset(values);
    }
  }, [editingId, editingData, reset, variantsOption, salesChannel]);

  function createDefaults(): SalesForm {
    return {
      sale_date: null, // default วันนี้
      customer_name: "", // ค่าว่าง
      province: "", // ค่าว่าง
      variant_id: null, // ยังไม่เลือก
      quantity_pack: null, // ยังไม่กรอก
      unit_price_at_sale: null,
      channel_id: null, // ยังไม่เลือก
      shipping_fee: null,
      platform_discount: null,
      shop_discount: null,
      coin_discount: null,
      // ถ้ามี note ในฟอร์มก็ใส่ด้วย
      // note: "",
    };
  }

  const handleCancel = () => {
    // ล้างค่าฟอร์มกลับไปค่าเริ่มต้น
    reset(createDefaults(), {
      keepDirty: false,
      keepErrors: false,
      keepTouched: false,
      keepIsSubmitted: false,
      keepSubmitCount: false,
    });
    resetField("shipping_fee");
  };

  const buildFormData = useCallback((data: SalesForm): FormData => {
    const formData = new FormData();
    formData.append(
      "variant_id",
      data.variant_id !== null ? data.variant_id.toString() : ""
    );
    formData.append(
      "channel_id",
      data.channel_id !== null ? data.channel_id.toString() : ""
    );
    formData.append(
      "sale_date",
      data.sale_date !== null ? formatISO(data.sale_date) : ""
    );
    formData.append("customer_name", data.customer_name);
    formData.append("province", data.province);
    formData.append(
      "quantity_pack",
      data.quantity_pack !== null ? data.quantity_pack.toString() : ""
    );
    formData.append(
      "unit_price_at_sale",
      data.unit_price_at_sale !== null ? data.unit_price_at_sale.toString() : ""
    );
    formData.append(
      "shipping_fee",
      data.shipping_fee !== null ? data.shipping_fee.toString() : ""
    );
    formData.append(
      "platform_discount",
      data.platform_discount !== null ? data.platform_discount.toString() : ""
    );
    formData.append(
      "shop_discount",
      data.shop_discount !== null ? data.shop_discount.toString() : ""
    );
    formData.append(
      "coin_discount",
      data.coin_discount !== null ? data.coin_discount.toString() : ""
    );
    return formData;
  }, []);

  const onSubmit: SubmitHandler<SalesForm> = async (data: SalesForm) => {
    console.log("submit", data);
    const formData = buildFormData(data);

    try {
      if (editingId) {
        await axios.patch(
          `http://localhost:5001/api/sale/${editingId}`,
          formData
        );
        handleCancel();
        handleEdit(null);
      } else {
        await axios.post(
          `http://localhost:5001/api/sale/${product.id}`,
          formData
        );
      }
      reset();
      salesOrderMutate();
    } catch (error) {
      console.error("❌ Upload failed:", error);
    }
  };

  const handleOpen = () => {
    setIsModalOpen((prev) => !prev);
  };

  return (
    <>
      <form id="add-sale-order-form" onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-[1fr_1fr] gap-3">
          <div className="flex flex-col">
            <Controller
              name="sale_date"
              control={control}
              render={({ field }) => (
                <DatePicker label="วันที่รับเข้า" field={field} />
              )}
            />
            <TextInput
              placeholder="ชื่อลูกค้า"
              name="customer_name"
              label="ชื่อลูกค้า"
              register={register}
              type="text"
            />
            <TextInput
              placeholder="จังหวัดที่จัดส่ง"
              name="province"
              label="จังหวัดที่จัดส่ง"
              register={register}
              type="text"
            />
            <Controller
              name="variant_id"
              control={control}
              render={({ field }) => (
                <VariantSelect
                  unit={product.unit}
                  label="ขนาดการขาย"
                  options={activeVariantsOption}
                  value={field.value ?? undefined}
                  onChange={field.onChange}
                  disabled={!!editingId}
                />
              )}
            />
            <TextInput
              placeholder="จำนวน"
              name="quantity_pack"
              label="จำนวน"
              register={register}
              type="number"
              disabled={!!editingId}
            />
            <TextInput
              placeholder="ราคาขายต่อหน่วย"
              name="unit_price_at_sale"
              label="ราคาขายต่อหน่วย"
              register={register}
              type="number"
            />
          </div>
          <div className="flex flex-col">
            <Controller
              name="channel_id"
              control={control}
              render={({ field }) => (
                <ChannelSelect
                  label="ช่องทางการขาย"
                  options={salesChannel}
                  value={field.value ?? undefined}
                  onChange={field.onChange}
                />
              )}
            />
            {/* <div className="flex flex-col">
                <button
                  className="border-1 px-5 py-2"
                  type="button"
                  onClick={handleOpen}
                >
                  ตั้งค่า
                </button>
              </div> */}
            <TextInput
              placeholder="ค่าจัดส่ง (ผู้ซื้อชำระ)"
              name="shipping_fee"
              label="ค่าจัดส่ง (ผู้ซื้อชำระ)"
              register={register}
              type="number"
            />
            <TextInput
              placeholder="ส่วนลด platform"
              name="platform_discount"
              label="ส่วนลด platform"
              register={register}
              type="number"
            />
            <TextInput
              placeholder="ส่วนลดร้านค้า"
              name="shop_discount"
              label="ส่วนลดร้านค้า"
              register={register}
              type="number"
            />
            <TextInput
              placeholder="ส่วนลด Coin"
              name="coin_discount"
              label="ส่วนลด Coin"
              register={register}
              type="number"
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
              <SubmitButton text="Save Change" form="add-sale-order-form" />
            </div>
          ) : (
            <SubmitButton text="Add Sale" form="add-sale-order-form" />
          )}
        </div>
      </form>
    </>
  );
};

export default Form;
