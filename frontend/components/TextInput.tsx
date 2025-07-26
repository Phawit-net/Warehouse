import { UseFormRegister } from "react-hook-form";

type Props = {
  label: string;
  name: string;
  register: UseFormRegister<any>;
  placeholder?: string;
  margin?: number;
  type: "text" | "number";
  isLabel?: boolean;
};

const TextInput = ({
  label,
  name,
  register,
  placeholder,
  margin = 5,
  type = "text",
  isLabel = true,
}: Props) => {
  return (
    <div
      className={`flex flex-col mb-${margin} ${isLabel ? "gap-1" : "gap-0"}`}
    >
      {isLabel && <label className="text-md font-semibold">{label}</label>}
      <input
        type={type}
        {...register(name)}
        placeholder={placeholder}
        autoComplete="off"
        className="p-2 rounded bg-[#fff0e4] focus:outline-none text-gray-500 focus:ring-2 focus:ring-[#ffc596]"
      />
    </div>
  );
};

export default TextInput;
