"use client";
import { useRef } from "react";
import Image from "next/image";

type Props = {
  label: string;
  margin?: number;
  isLabel?: boolean;
  image: File | null;
  onChange: (file: File | null) => void;
  imagePreview: string;
  onRemovePreview?: () => void;
};

const ImageUploader = ({
  label,
  margin = 5,
  isLabel = true,
  image,
  onChange,
  imagePreview,
  onRemovePreview,
}: Props) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onChange(file);
    }
  };

  const handleDeleteImage = () => {
    onChange(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const handleClickUpload = () => {
    inputRef.current?.click();
  };

  return (
    <div
      className={`flex flex-col mb-${margin} ${isLabel ? "gap-1" : "gap-0"}`}
    >
      {isLabel && <label className="text-md font-semibold">{label}</label>}
      {imagePreview ? (
        <div className="group border-2 bg-amber-300 border-gray-300 rounded-xl w-full h-80 flex cursor-pointer relative overflow-hidden">
          <div className="relative w-full rounded overflow-hidden group">
            <Image
              className="object-contain rounded-2xl"
              src={imagePreview}
              alt="edit-preview"
              fill
              sizes="auto"
            />
            <div className="absolute top-1 right-1 text-white flex gap-3 text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100">
              <button
                type="button"
                className="text-gray-700 cursor-pointer bg-[#ffe4ce] p-1.5 rounded-sm"
                onClick={onRemovePreview}
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
          </div>
        </div>
      ) : (
        <>
          {image ? (
            <div className="group border-2 bg-red-500 border-gray-300 rounded-xl w-full h-80 flex cursor-pointer relative overflow-hidden">
              <div className="relative w-full rounded overflow-hidden group">
                <Image
                  className="object-contain rounded-2xl"
                  src={URL.createObjectURL(image)}
                  alt="upload-preview"
                  fill
                  sizes="auto"
                />
                <div className="absolute top-1 right-1 text-white flex gap-3 text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100">
                  <button
                    type="button"
                    className="text-gray-700 cursor-pointer bg-[#ffe4ce] p-1.5 rounded-sm"
                    onClick={handleClickUpload}
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
                        d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z"
                      />
                    </svg>
                  </button>
                  <button
                    type="button"
                    className="text-gray-700 cursor-pointer bg-[#ffe4ce] p-1.5 rounded-sm"
                    onClick={handleDeleteImage}
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
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </div>
            </div>
          ) : (
            <div
              onClick={handleClickUpload}
              className="border-2 border-dashed border-gray-300 rounded-xl w-full h-80 flex items-center justify-center cursor-pointer hover:border-[#ffc596] transition"
            >
              <div className="flex flex-col items-center gap-3">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1"
                  stroke="currentColor"
                  className="size-10"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
                  />
                </svg>
                <label className="text-gray-500">
                  ลากไฟล์มาวาง หรือ คลิกเพื่ออัปโหลด
                </label>
              </div>
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ImageUploader;
