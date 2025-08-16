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
          await axios.post("http://localhost:5001/api/inventory", formData);
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
          <div className="grid grid-cols-[1.5fr_1fr] gap-3">
            <div className="bg-white p-12 rounded-xl">
              <TextInput
                label="ชื่อสินค้า"
                name="name"
                type="text"
                register={register}
                placeholder=""
              />
              <TextInput
                label="SKU"
                name="sku"
                type="text"
                register={register}
                placeholder=""
              />
              <TextInput
                label="หมวดหมู่"
                name="category"
                type="text"
                register={register}
                placeholder={"category"}
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
              <div className="flex flex-col mb-5 gap-1">
                <label className="text-md font-semibold">รูปแบบการขาย</label>
                <div className="flex flex-col items-center ">
                  <div className="border-2 border-dashed border-[#f49b50] rounded p-2">
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
                  <div className="mt-5">
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
                      className="text-[#f49b50] border-2 border-dashed p-2 rounded-lg"
                    >
                      + เพิ่มรูปแบบการขาย
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-white p-12 rounded-xl">
              <ImageUploader
                label="รูปภาพหลัก"
                image={mainImageFile}
                onChange={onMainImageChange}
                imagePreview={mainPreviewUrl || ""}
                onRemovePreview={onMainImageRemove}
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
