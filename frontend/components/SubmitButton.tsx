import React from "react";

type Props = {
  text: string;
  form: string;
};

const SubmitButton = React.memo(({ text, form }: Props) => {
  return (
    <button
      type="submit"
      form={form}
      className="bg-[#f49b50] p-2 px-3 text-white flex justify-center items-center justify-items-center gap-2 rounded-sm cursor-pointer"
    >
      <span>{text}</span>
    </button>
  );
});

export default SubmitButton;
