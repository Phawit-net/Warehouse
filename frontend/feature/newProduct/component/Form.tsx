"use client";
import { useFieldArray, useForm } from "react-hook-form";
import axios from "axios";
import TextInput from "@/components/TextInput";
import ImageUploader from "@/components/ImageUploader";
import MultiImageUploader from "@/components/MultiImageUploader";
import { useCallback, useEffect, useState } from "react";
import { useRootPathRedirect } from "@/hooks/useRootPathRedirect";

type SaleMode = {
  sale_mode: string;
  selling_price: number;
  sku_suffix: string;
  pack_size: number;
};

type ProductForm = {
  main_image: File | null;
  other_images: File[];
  name: string;
  sku: string;
  category: string;
  unit: string;
  cost_price: number;
  stock: number;
  variants: SaleMode[]; // 👈 เป็น array ของรูปแบบการขาย
};

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

  const { register, handleSubmit, setValue, watch, control, reset } =
    useForm<ProductForm>({
      defaultValues: {
        main_image: null,
        other_images: [],
        variants: [{ sale_mode: "", sku_suffix: "" }],
      },
    });
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
          : [{ sale_mode: "", sku_suffix: "" }],
      });
    }
  }, [initialData, reset]);

  const buildFormData = useCallback(
    (data: ProductForm): FormData => {
      const formData = new FormData();

      formData.append("name", data.name);
      formData.append("sku", data.sku);
      formData.append("category", data.category);
      formData.append("unit", data.unit);
      formData.append("cost_price", data.cost_price.toString());
      formData.append("variants", JSON.stringify(data.variants));

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
    async (data: ProductForm) => {
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

  return (
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
          <div className="flex flex-col mb-5 gap-1">
            <label className="text-md font-semibold">รูปแบบการขาย</label>
            <div className="flex flex-col items-center ">
              <div className="border-2 border-dashed border-[#f49b50] rounded p-2">
                {fields.map((field, index) => (
                  <div
                    key={field.id}
                    className={`p-2 grid ${
                      fields.length > 1
                        ? "grid-cols-[6fr_3fr_3fr_6fr_0.5fr]"
                        : "grid-cols-[4fr_1.5fr_1.5fr_3fr]"
                    } gap-3 `}
                  >
                    <TextInput
                      label=""
                      isLabel={false}
                      margin={0}
                      type="text"
                      placeholder="รูปแบบการขาย"
                      name={`variants.${index}.sale_mode`}
                      register={register}
                    />
                    <TextInput
                      label=""
                      isLabel={false}
                      margin={0}
                      placeholder="จำนวนต่อแพ็ค"
                      name={`variants.${index}.pack_size`}
                      register={register}
                      type="number"
                    />
                    <TextInput
                      label=""
                      isLabel={false}
                      margin={0}
                      placeholder="ราคาขาย"
                      name={`variants.${index}.selling_price`}
                      register={register}
                      type="number"
                    />
                    <TextInput
                      label=""
                      isLabel={false}
                      margin={0}
                      type="text"
                      placeholder="SKU ต่อท้าย"
                      name={`variants.${index}.sku_suffix`}
                      register={register}
                    />
                    {fields.length > 1 && (
                      <div className="flex items-center">
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
                ))}
              </div>
              <div className="mt-5">
                <button
                  type="button"
                  onClick={() =>
                    append({
                      sale_mode: "",
                      selling_price: 0,
                      sku_suffix: "",
                      pack_size: 1,
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
            onChange={(file: File | null) => setValue("main_image", file)}
            imagePreview={mainPreviewUrl || ""}
            onRemovePreview={() => {
              setMainPreviewUrl(null);
            }}
          />
          <MultiImageUploader
            label="รูปภาพเพิ่มเติม"
            images={otherImageFiles}
            onChange={(files: File[]) => setValue("other_images", files)}
            imagePreviews={otherPreviewUrls}
            onRemovePreview={(index) => {
              const updatedUrls = [...otherPreviewUrls];
              const updatedFilenames = [...keptOldImages];
              updatedUrls.splice(index, 1);
              updatedFilenames.splice(index, 1);
              setOtherPreviewUrls(updatedUrls);
              setKeptOldImages(updatedFilenames);
            }}
          />
        </div>
      </div>
    </form>
  );
};

export default Form;
