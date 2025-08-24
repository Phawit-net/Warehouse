import React, { useState } from "react";

type Props = {
  title: string;
  defaultOpen?: boolean;
  className?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
};

const Collapse = ({
  title,
  defaultOpen = false,
  className = "",
  icon,
  children,
}: Props) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      className={`rounded-sm border border-gray-200 bg-white  dark:bg-neutral-900 dark:border-neutral-800 ${className} mb-5`}
    >
      <button
        type="button"
        className={`w-full flex items-center justify-between gap-3 px-3 py-3 transform duration-300 cursor-pointer ${
          open && "border-b-1"
        }`}
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex justify-center items-center gap-2">
          {icon}
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {title}
          </span>
        </div>
        <svg
          className={`size-6 shrink-0 transition-transform duration-200 ${
            open ? "rotate-180" : "rotate-0"
          } text-gray-900`}
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="1.5"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m4.5 15.75 7.5-7.5 7.5 7.5"
          />
        </svg>
      </button>

      {/* Animated content: auto-height */}
      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        } overflow-hidden`}
      >
        <div className="min-h-0 px-5 text-sm text-gray-700 dark:text-gray-300">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Collapse;
