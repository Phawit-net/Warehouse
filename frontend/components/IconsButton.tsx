import React from "react";

type ColorType = keyof typeof colorMap;

type Props = {
  color: ColorType;
  type: "edit" | "delete" | "import" | "sale";
  handleClick?: (e: { stopPropagation: () => void }) => void;
  onMouseEnter?: () => void;
  disabled?: boolean;
};

const colorMap = {
  blue: "bg-[#6baefa] hover:bg-[#539fe2]",
  red: "bg-[#ef6b6b] hover:bg-[#d85454]",
};

const IconsButton = ({
  color,
  type,
  handleClick,
  onMouseEnter,
  disabled = false,
}: Props) => {
  return (
    <button
      type="button"
      disabled={disabled}
      className={`border-1 border-gray-200 w-fit rounded-sm p-1 cursor-pointer hover:bg-gray-200 transition duration-200 ${
        disabled
          ? "disabled:bg-gray-300 disabled:cursor-not-allowed"
          : "cursor-pointer"
      } `}
      onMouseEnter={onMouseEnter}
      onClick={handleClick}
    >
      {type === "edit" ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="1.5"
          stroke="currentColor"
          className={`h-5 w-5 ${
            disabled ? "text-gray-400" : "hover:text-[#f49b50]"
          }  `}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
          />
        </svg>
      ) : type === "delete" ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="1.5"
          stroke="currentColor"
          className={`h-5 w-5 ${
            disabled ? "text-gray-400" : "hover:text-[#f49b50]"
          }  `}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
          />
        </svg>
      ) : type === "import" ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="1.5"
          stroke="currentColor"
          className={`h-5 w-5 ${
            disabled ? "text-gray-400" : "hover:text-[#f49b50]"
          }  `}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"
          />
        </svg>
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="1.5"
          stroke="currentColor"
          className={`h-5 w-5 ${
            disabled ? "text-gray-400" : "hover:text-[#f49b50]"
          }  `}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
          />
        </svg>
      )}
    </button>
  );
};

export default IconsButton;
