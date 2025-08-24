import React, { useRef } from "react";
import Image from "next/image";

type Props = {
  label?: string;
  margin?: number;
  isLabel?: boolean;
  images: File[];
  onChange: (files: File[]) => void;
  imagePreviews: string[];
  onRemovePreview?: (index: number) => void;
};

const MultiImageUploader: React.FC<Props> = React.memo(
  ({
    label,
    margin = 5,
    isLabel = true,
    images,
    onChange,
    imagePreviews,
    onRemovePreview,
  }) => {
    const inputRef = useRef<HTMLInputElement>(null);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      onChange([...images, ...files]); // เพิ่มไฟล์ใหม่เข้า array เดิม
    };

    const handleRemove = (index: number) => {
      const updated = [...images];
      updated.splice(index, 1);
      onChange(updated);
    };

    return (
      <div
        className={`flex flex-col mb-${margin} ${isLabel ? "gap-1" : "gap-0"}`}
      >
        {isLabel && <label className="text-md font-semibold">{label}</label>}

        <div className="grid grid-cols-3 gap-2">
          {imagePreviews?.map((url, index) => (
            <div
              key={`preview-${index}`}
              className="relative w-full h-32 border rounded overflow-hidden group cursor-pointer hover:ring-1 hover:ring-[#ffc596] hover:border-[#ffc596] transition"
            >
              <Image
                src={url}
                alt={`preview-${index}`}
                fill
                className="object-contain"
                sizes="auto"
              />
              {onRemovePreview && (
                <button
                  type="button"
                  onClick={() => onRemovePreview(index)}
                  className="absolute top-1 right-1 text-white bg-black/60 text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100"
                >
                  ลบ
                </button>
              )}
            </div>
          ))}

          {images.map((file, index) => (
            <div
              key={index}
              className="relative w-full h-32 border rounded-sm overflow-hidden group cursor-pointer hover:ring-1 hover:ring-[#ffc596] hover:border-[#ffc596] transition"
            >
              <Image
                src={URL.createObjectURL(file)}
                alt={`upload-${index}`}
                fill
                className="object-contain"
                sizes="auto"
              />
              <button
                type="button"
                onClick={() => handleRemove(index)}
                className="cursor-pointer absolute top-1 right-1 text-white bg-black/60 text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100"
              >
                ลบ
              </button>
            </div>
          ))}

          <div
            onClick={() => inputRef.current?.click()}
            className="flex items-center justify-center border-1 rounded-sm h-32 cursor-pointer text-gray-300 hover:ring-1 hover:ring-[#ffc596] hover:border-[#ffc596] transition"
          >
            <div className="flex items-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
                className="size-5 text-gray-500"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
                />
              </svg>

              <label className="text-gray-500">เพิ่มรูป</label>
            </div>
          </div>
        </div>

        <input
          type="file"
          multiple
          accept="image/*"
          ref={inputRef}
          onChange={handleImageChange}
          className="hidden"
        />
      </div>
    );
  }
);

export default MultiImageUploader;
