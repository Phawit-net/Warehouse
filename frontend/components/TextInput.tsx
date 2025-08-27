import { UseFormRegister } from "react-hook-form";

type Props = {
  label: string;
  name: string;
  register: UseFormRegister<any>;
  placeholder?: string;
  margin?: number;
  type: "text" | "number";
  isLabel?: boolean;
  float?: boolean;
  disabled?: boolean;
  required?: boolean;
};

const TextInput = ({
  label,
  name,
  register,
  placeholder,
  margin = 5,
  type = "text",
  isLabel = true,
  float = false,
  disabled = false,
  required = false,
}: Props) => {
  return (
    <div
      className={`flex flex-col mb-${margin} ${isLabel ? "gap-1" : "gap-0"}`}
    >
      {isLabel && (
        <label className="text-md font-semibold">
          {label}
          {required && <label className="text-red-600"> *</label>}
        </label>
      )}
      <input
        type={type}
        disabled={disabled}
        step={float ? "0.01" : "1"}
        {...register(name)}
        placeholder={placeholder}
        autoComplete="off"
        className="p-2 rounded-sm border  border-gray-200 transition duration-200 focus:border-white focus:outline-none text-gray-500 focus:ring-2 focus:ring-[#ffc596] disabled:cursor-not-allowed disabled:bg-[#e2e2e2]"
        onKeyPress={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
          }
        }}
      />
    </div>
  );
};

export default TextInput;
