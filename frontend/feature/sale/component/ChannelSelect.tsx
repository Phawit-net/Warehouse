import React, { useEffect, useRef, useState } from "react";

type Props = {
  label: string;
  margin?: number;
  isLabel?: boolean;
  options: { [key: string]: string | number }[];
  value?: string | number;
  onChange?: (value: string | number) => void;
};

const ChannelSelect = ({
  label,
  options,
  value,
  margin = 5,
  isLabel = true,
  onChange,
}: Props) => {
  const [open, setOpen] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleSelect = (option: string | number) => {
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
    <div
      ref={containerRef}
      className={`flex flex-col mb-${margin} relative ${
        isLabel ? "gap-1" : "gap-0"
      }`}
    >
      {<label className="text-md font-semibold">{label}</label>}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center gap-2 justify-between text-left text-gray-500 px-3 py-2 rounded-sm border border-gray-200 focus:border-white focus:ring-2 focus:ring-[#ffc596]"
      >
        {value
          ? `${options.find((o) => o.id === value)?.channel_name}`
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
              key={option.id}
              onClick={() => handleSelect(option.id)}
              className="px-3 py-2 flex items-center justify-start text-gray-500 hover:rounded hover:bg-gray-100 cursor-pointer"
            >
              {option.channel_name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ChannelSelect;
