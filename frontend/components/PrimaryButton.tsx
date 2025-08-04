import React from "react";

type Props = {
  text: string;
  handleClick: () => void;
};

const PrimaryButton = React.memo(({ text, handleClick }: Props) => {
  return (
    <button
      type="button"
      className="bg-[#f49b50] p-2 px-3 text-white flex justify-center items-center justify-items-center gap-2 rounded-lg"
      onClick={handleClick}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth="1.5"
        stroke="currentColor"
        className="size-6"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 8.25H7.5a2.25 2.25 0 0 0-2.25 2.25v9a2.25 2.25 0 0 0 2.25 2.25h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25H15m0-3-3-3m0 0-3 3m3-3V15"
        />
      </svg>

      <span>{text}</span>
    </button>
  );
});

export default PrimaryButton;
