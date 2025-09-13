"use client";
import {
  useFieldArray,
  useForm,
  FormProvider,
  Controller,
} from "react-hook-form";
import axios from "axios";
import TextInput from "@/components/TextInput";
import ImageUploader from "@/components/ImageUploader";
import MultiImageUploader from "@/components/MultiImageUploader";
import { useCallback, useEffect, useState } from "react";
import { useRootPathRedirect } from "@/hooks/useRootPathRedirect";
import ConfirmModal from "@/components/ConfirmModal";
import VariantField from "./VariantField";
import ToggleSwitch from "@/components/ToggleSwitch";
import Collapse from "@/components/Collapse";
import SubmitButton from "@/components/SubmitButton";
import { axiosInst } from "@/lib/api";

type Props = {
  mode: "add" | "edit";
  initialData?: Products; // ใน mode 'edit' เท่านั้น
};

const Form = ({ mode, initialData }: Props) => {
  const redirectToRoot = useRootPathRedirect();
  const [mainPreviewUrl, setMainPreviewUrl] = useState<string | null>(null);
  const [otherPreviewUrls, setOtherPreviewUrls] = useState<string[]>([]);

  // เก็บชื่อไฟล์ other_image เก่าเวลากด Edit
  const [keptOldImages, setKeptOldImages] = useState<string[]>([]);
  const [modalState, setModalState] = useState<{
    show: boolean;
    message: string;
    variantId: number | null;
    variantIndex: number | null;
  }>({ show: false, message: "", variantId: null, variantIndex: null });

  const methods = useForm<ProductFormData>({
    defaultValues: {
      main_image: null,
      other_images: [],
      variants: [{ sale_mode: "", sku_suffix: "", is_active: true }],
    },
  });

  const { register, handleSubmit, setValue, watch, control, reset } = methods;
  const { fields, append, remove } = useFieldArray({
    control,
    name: "variants",
  });

  const mainImageFile = watch("main_image");
  const otherImageFiles = watch("other_images");

  //Set initial data เข้าไป ใน form ต่างๆ จากหน้า EDIT
  useEffect(() => {
    if (initialData) {
      // ดึงชื่อไฟล์รูปหลักจากการ GET by id => {filename:..., is_main:true}
      const mainImage = initialData.images?.find((img: any) => img.is_main);
      // ดึงชื่อไฟล์รูปอื่นๆจากการ GET by id => [{filename:..., is_main:false}]
      const otherImages = initialData.images?.filter(
        (img: any) => !img.is_main
      );
      const otherUrls = otherImages.map(
        (img: any) =>
          `http://127.0.0.1:5001/api/inventory/uploads/${img.filename}`
      );
      setMainPreviewUrl(
        mainImage
          ? `http://127.0.0.1:5001/api/inventory/uploads/${mainImage.filename}`
          : null
      );
      setOtherPreviewUrls(otherUrls);

      const keptFilenames = otherImages.map((img: any) => img.filename);
      setKeptOldImages(keptFilenames);
      // 🧠 ตั้งค่า default ของ form โดยไม่ใส่ image (เพราะเป็น URL)
      reset({
        ...initialData,
        main_image: null,
        other_images: [],
        variants: initialData.variants?.length
          ? initialData.variants
          : [{ sale_mode: "", sku_suffix: "", is_active: true }],
      });
    }
  }, [initialData, reset]);

  const buildFormData = useCallback(
    (data: ProductFormData): FormData => {
      console.log("DATA PRO", data);

      const formData = new FormData();

      formData.append("name", data.name);
      formData.append("sku", data.sku);
      formData.append("category", data.category);
      formData.append("unit", data.unit);
      formData.append("cost_price", data.cost_price.toString());
      formData.append("variants", JSON.stringify(data.variants));
      formData.append("has_expire", data.has_expire.toString());

      // ✅ แนบรูปหลัก
      if (data.main_image) {
        formData.append("main_image", data.main_image);
      }

      // ✅ แนบรูปอื่น
      data.other_images.forEach((file) => {
        formData.append("other_images", file);
      });

      // ✅ แนบชื่อรูปภาพที่ต้องลบ
      if (initialData) {
        const initialFilenames =
          initialData.images
            ?.filter((img) => !img.is_main)
            .map((img) => img.filename) || [];
        const deletedImages = initialFilenames.filter(
          (filename) => !keptOldImages.includes(filename)
        );
        deletedImages.forEach((filename) =>
          formData.append("images_to_delete", filename)
        );
      }

      return formData;
    },
    [initialData, keptOldImages]
  );

  const onSubmit = useCallback(
    async (data: ProductFormData) => {
      console.log(data);
      const formData = buildFormData(data);
      try {
        if (mode === "add") {
          await axiosInst.post("/api/inventory", formData);
        } else if (mode === "edit" && initialData?.id) {
          await axios.patch(
            `http://localhost:5001/api/inventory/${initialData.id}`,
            formData
          );
        }
        redirectToRoot();
      } catch (error) {
        console.error("❌ Upload failed:", error);
        // TODO: Add toast / error UI
      }
    },
    [mode, initialData, redirectToRoot, buildFormData]
  );

  const onHardDeleteConfirm = async () => {
    if (!modalState.variantId || modalState.variantIndex === null) return;
    setModalState({ ...modalState, show: false });

    try {
      await axios.delete(
        `http://localhost:5001/api/inventory/variant/${modalState.variantId}`
      );
      remove(modalState.variantIndex); // ลบออกจาก UI หลังจากลบจาก Backend สำเร็จ
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        alert(error.response.data.error); // แจ้งเตือนข้อผิดพลาดจาก Backend
      } else {
        console.error("❌ Failed to delete:", error);
      }
    }
  };

  const onMainImageChange = useCallback(
    (file: File | null) => setValue("main_image", file),
    [setValue]
  );

  const onMainImageRemove = useCallback(() => {
    setMainPreviewUrl(null);
  }, []);

  const onOtherImagesChange = useCallback(
    (files: File[]) => setValue("other_images", files),
    [setValue]
  );

  const onOtherImagesRemove = useCallback(
    (index: number) => {
      const updatedUrls = [...otherPreviewUrls];
      const updatedFilenames = [...keptOldImages];
      updatedUrls.splice(index, 1);
      updatedFilenames.splice(index, 1);
      setOtherPreviewUrls(updatedUrls);
      setKeptOldImages(updatedFilenames);
    },
    [otherPreviewUrls, keptOldImages]
  );

  return (
    <>
      <FormProvider {...methods}>
        <form
          id="add-product-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col space-y-2"
        >
          <Collapse
            defaultOpen={true}
            title="Product Information"
            icon={
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
                className="size-6 text-[#f49b50]"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z"
                />
              </svg>
            }
          >
            <div className="grid grid-cols-[1.5fr_1fr] gap-7 py-4">
              <div>
                <TextInput
                  label="ชื่อสินค้า"
                  name="name"
                  type="text"
                  register={register}
                  placeholder=""
                  required={true}
                />
                <TextInput
                  label="SKU"
                  name="sku"
                  type="text"
                  register={register}
                  placeholder=""
                  required={true}
                />
                <TextInput
                  label="หมวดหมู่"
                  name="category"
                  type="text"
                  register={register}
                  placeholder={"category"}
                  required={true}
                />
                <TextInput
                  label="หน่วยนับ"
                  name="unit"
                  type="text"
                  register={register}
                  placeholder={"เช่น ชิ้น, กล่อง, แพค, ใบ"}
                />
                <TextInput
                  label="ราคาต้นทุน"
                  type="number"
                  name="cost_price"
                  register={register}
                  placeholder=""
                />
                <Controller
                  name={`has_expire`}
                  control={control}
                  render={({ field }) => (
                    <div className="flex justify-between border-1 rounded-sm p-2 shadow-sm mb-5">
                      <div>
                        <label className="text-md font-semibold">
                          สินค้าเป็นประเภทที่มีวันหมดอายุหรือไม่?
                        </label>
                        <p>
                          กรุณาตั้งค่าเปิด-ปิดเพื่อระบุสินค้า
                          เนื่องจากมีผลต่อการรับเข้าสินค้า
                        </p>
                      </div>
                      <ToggleSwitch
                        enabled={field.value}
                        onChange={field.onChange}
                      />
                    </div>
                  )}
                />
              </div>
              <div>
                <ImageUploader
                  label="รูปภาพหลัก"
                  image={mainImageFile}
                  onChange={onMainImageChange}
                  imagePreview={mainPreviewUrl || ""}
                  onRemovePreview={onMainImageRemove}
                  required={true}
                />
                <MultiImageUploader
                  label="รูปภาพเพิ่มเติม"
                  images={otherImageFiles}
                  onChange={onOtherImagesChange}
                  imagePreviews={otherPreviewUrls}
                  onRemovePreview={onOtherImagesRemove}
                />
              </div>
            </div>
          </Collapse>
          <Collapse
            defaultOpen={true}
            title="Pricing"
            icon={
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
                className="size-6 text-[#f49b50]"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z"
                />
              </svg>
            }
          >
            <div className="py-4 flex flex-col gap-1">
              <div className="flex justify-between items-center">
                <label className="text-md font-semibold">รูปแบบการขาย</label>
                <button
                  type="button"
                  onClick={() =>
                    append({
                      id: 0,
                      sale_mode: "",
                      selling_price: 0,
                      sku_suffix: "",
                      pack_size: 1,
                      is_active: true,
                    })
                  }
                  className="text-[#f49b50] flex items-center gap-1 cursor-pointer"
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
              <div className="border-1 border-gray-200 rounded-sm">
                <div
                  className={`bg-gray-100 rounded-b-none rounded-sm grid gap-3 p-3 ${
                    fields.length > 1
                      ? mode === "edit"
                        ? "grid-cols-[1fr_1fr_1fr_1fr_0.3fr_0.1fr]"
                        : "grid-cols-[1fr_1fr_1fr_1fr_0.1fr]"
                      : mode === "edit"
                      ? "grid-cols-[1fr_1fr_1fr_1fr_0.3fr]"
                      : "grid-cols-[1fr_1fr_1fr_1fr]"
                  }`}
                >
                  <span>รูปแบบการขาย</span>
                  <span>จำนวนต่อแพ็ค</span>
                  <span>ราคาขาย</span>
                  <span>SKU</span>
                  {mode === "edit" && <span>ปิดการใช้ชั่วคราว</span>}
                </div>
                {fields.map((field, index) => (
                  <VariantField
                    key={field.id}
                    index={index}
                    remove={remove}
                    fieldsLength={fields.length}
                    mode={mode}
                    setModalState={setModalState}
                  />
                ))}
              </div>
            </div>
          </Collapse>
          <div className="flex justify-end">
            {mode === "add" ? (
              <SubmitButton text="Add Product" form="add-product-form" />
            ) : (
              <SubmitButton text="Save Changes" form="add-product-form" />
            )}
          </div>
        </form>
      </FormProvider>
      <ConfirmModal
        show={modalState.show}
        message={modalState.message}
        onConfirm={onHardDeleteConfirm}
        onCancel={() => setModalState({ ...modalState, show: false })}
      />
    </>
  );
};

export default Form;
