import React from "react";
import { useState, useRef, useEffect } from "react";

type Props = {
  options: number[];
  limit: number;
  onChange: (newLimit: number) => void;
};

export const Select = React.memo(({ options, limit, onChange }: Props) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-2 w-30 justify-center text-left text-gray-500 px-3 py-2 border border-gray-200 rounded bg-white shadow-sm"
      >
        Show {limit}
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
            d="m4.5 15.75 7.5-7.5 7.5 7.5"
          />
        </svg>
      </button>

      {open && (
        <ul className="absolute bottom-full mb-1 bg-white border border-gray-200 rounded-lg shadow-sm z-10">
          {options.map((option) => (
            <li
              key={option}
              onClick={() => {
                onChange(option);
                setOpen(false);
              }}
              className="w-full px-3 py-2 flex items-center justify-center  text-gray-500 hover:rounded hover:bg-gray-100 cursor-pointer"
            >
              Show {option}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
});
