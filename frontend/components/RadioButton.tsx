import React from "react";

type Props = {
  options: string[];
  value?: string;
  onChange?: (value: string) => void;
  margin?: number;
  label: string;
  isLabel?: boolean;
};

const RadioButton = ({
  options,
  value,
  onChange,
  margin = 5,
  label,
  isLabel = true,
}: Props) => {
  const handleSelect = (option: string) => {
    onChange?.(option); // ส่งค่าที่เลือกกลับไปยัง react-hook-form
  };

  return (
    <div
      className={`flex flex-col mb-${margin} ${isLabel ? "gap-1" : "gap-0"}`}
    >
      {isLabel && <label className="text-md font-semibold">{label}</label>}
      <ul className="flex gap-5">
        {options.map((item) => {
          return (
            <li
              onClick={() => handleSelect(item)}
              key={item}
              className={`border-2 py-2 px-3 rounded-sm flex  items-center justify-center gap-3 ${
                value === item ? "border-[#f49b50]" : ""
              }`}
            >
              <span>{item}</span>
              <div
                className={`${
                  value === item ? "bg-[#f49b50]" : "bg-white"
                } w-4 h-4 rounded-full flex items-center justify-center`}
              >
                <div className="bg-white w-2.5 h-2.5 rounded-full"></div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default RadioButton;
