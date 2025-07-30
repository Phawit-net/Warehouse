import ToggleSwitch from "@/components/ToggleSwitch";
import React from "react";

type Props = {
  label?: string;
  isToggle: boolean;
  children: React.ReactNode;
  onChange: React.Dispatch<React.SetStateAction<boolean>>;
};

const ToggleSwitchCard = ({ label, isToggle, children, onChange }: Props) => {
  return (
    <div
      className={`flex flex-col gap-2 border-2 p-3 mx-2 mb-2 rounded-sm ${
        isToggle ? "border-[#f49b50]" : "border-gray-300"
      }`}
    >
      <div className="flex items-center justify-between ">
        <label
          className={`text-md font-semibold ${!isToggle && "text-gray-400"}`}
        >
          {label}
        </label>
        <ToggleSwitch enabled={isToggle} onChange={onChange} />
      </div>
      {children}
    </div>
  );
};

export default ToggleSwitchCard;
