import React, { useEffect, useRef, useState } from "react";

type Props = {
  options: Variants[];
  value?: number | null; // เพิ่ม value ที่เลือก
  onChange?: (value: number) => void;
};

const Select = ({ options, value, onChange }: Props) => {
  const [open, setOpen] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleSelect = (option: number) => {
    onChange?.(option); // ส่งค่าที่เลือกกลับไปยัง react-hook-form
    setOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center gap-2 justify-between text-left text-gray-500 px-3 py-2 rounded-sm bg-[#fff0e4] focus:ring-2 focus:ring-[#ffc596]"
      >
        {value
          ? `${options.find((o) => o.id === value)?.sale_mode} (${
              options.find((o) => o.id === value)?.pack_size
            })`
          : "เลือก"}
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
            d="m19.5 8.25-7.5 7.5-7.5-7.5"
          />
        </svg>
      </button>

      {open && (
        <ul className="absolute top-full mt-3 w-full bg-white border border-gray-200 rounded-sm shadow-sm z-10">
          {options.map((option) => (
            <li
              key={option.sale_mode}
              onClick={() => handleSelect(option.id)}
              className="px-3 py-2 flex items-center justify-start text-gray-500 hover:rounded hover:bg-gray-100 cursor-pointer"
            >
              {`${option.sale_mode} (${option.pack_size})`}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Select;
