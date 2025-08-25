import { UseFormRegister } from "react-hook-form";

type Props = {
  label: string;
  name: string;
  register: UseFormRegister<any>;
  placeholder?: string;
  margin?: number;
  isLabel?: boolean;
};

const TextArea = ({
  label,
  name,
  register,
  placeholder,
  margin = 5,
  isLabel = true,
}: Props) => {
  return (
    <div
      className={`flex flex-col mb-${margin} ${isLabel ? "gap-1" : "gap-0"}`}
    >
      {isLabel && <label className="text-md font-semibold">{label}</label>}
      <textarea
        className="p-2 rounded-sm border-1 border-gray-200 focus:outline-none text-gray-500 focus:border-white focus:ring-2 focus:ring-[#ffc596] min-h-[80px] max-h-[120px]"
        {...register(name)}
        placeholder={placeholder}
        rows={3}
      />
    </div>
  );
};

export default TextArea;
