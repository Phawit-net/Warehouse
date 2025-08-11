import { Select } from "@/feature/product/component/Select";
import React, { useMemo } from "react";

interface Props {
  currentPage: number;
  limit: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onLimitChange: (newLimit: number) => void;
}

export const Pagination = React.memo(
  ({
    currentPage,
    limit,
    total,
    totalPages,
    onPageChange,
    onLimitChange,
  }: Props) => {
    const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
    const from = (currentPage - 1) * limit + 1;
    const to = Math.min(currentPage * limit, total);
    const limitOptions = useMemo(() => [10, 20, 50], []);

    return (
      <div className="flex items-center justify-between mt-4">
        <div className="flex items-center gap-2">
          <Select
            options={limitOptions}
            limit={limit}
            onChange={onLimitChange}
          />
          <span className="text-gray-400">
            Showing {from} to {to} of {total} entries
          </span>
        </div>
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="p-1.5 rounded border text-sm cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
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
                d="M15.75 19.5 8.25 12l7.5-7.5"
              />
            </svg>
          </button>

          {pages.map((page) => (
            <button
              type="button"
              key={page}
              onClick={() => onPageChange(page)}
              className={`px-3 py-2 rounded text-sm cursor-pointer
            ${page === currentPage ? "bg-gray-300" : "hover:bg-gray-100"}
          `}
            >
              {page}
            </button>
          ))}

          <button
            type="button"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="p-1.5 rounded border text-sm cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
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
                d="m8.25 4.5 7.5 7.5-7.5 7.5"
              />
            </svg>
          </button>
        </div>
      </div>
    );
  }
);
