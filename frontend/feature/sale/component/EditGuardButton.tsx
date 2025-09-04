"use client";
import { useEffect, useState } from "react";

type Props = {
  isWarning: boolean;
  header: string;
  desc: string;
  reason: string[];
  onProceed: () => void;
  className?: string;
  label?: string;
};

export default function EditGuardButton({
  isWarning = false,
  header,
  desc,
  reason,
  onProceed,
  className = "",
  label = "Edit",
}: Props) {
  const [open, setOpen] = useState(false);

  const handleClick = () => {
    if (isWarning) setOpen(true);
    else onProceed();
  };

  // ปิดด้วย Esc
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={
          "inline-flex cursor-pointer items-center gap-1 rounded border px-2 py-1 text-sm hover:bg-gray-50" +
          (isWarning
            ? "text-gray-500 hover:text-[#f49b50]"
            : "text-gray-800  hover:text-[#f49b50]") +
          " " +
          className
        }
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={isWarning ? "ดูสาเหตุที่แก้ไม่ได้" : "แก้ไข"}
      >
        {/* ไอคอนดินสอ */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="1.5"
          stroke="currentColor"
          className={`h-5 w-5`}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
          />
        </svg>
        <span>{label}</span>
        {isWarning && (
          <svg viewBox="0 0 20 20" className="size-4" aria-hidden="true">
            <path
              d="M6.5 9V7a3.5 3.5 0 1 1 7 0v2M5 9h10v8H5z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              className={`h-5 w-5`}
            />
          </svg>
        )}
      </button>

      {/* Modal */}
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <div className="relative w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-yellow-100 rounded-full text-yellow-700">
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
                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-700">{header}</h2>
              </div>
            </div>
            <div>
              <h2 className="mt-3 text-base font-semibold text-gray-700">
                {desc}
              </h2>
              <p className="mt-3 text-sm text-gray-700">เนื่องจาก : </p>
              {reason.map((r, index) => {
                return (
                  <div key={"reason" + index}>
                    <span className="ml-2 text-sm">• {r}</span>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded border px-3 py-1.5 text-sm"
                onClick={() => setOpen(false)}
              >
                ปิด
              </button>
              {/* ปุ่มดูรายละเอียด batch/ประวัติ (ถ้ามีลิงก์) */}
              {/* <Link href={`/batches/${batchId}`} className="rounded bg-gray-900 px-3 py-1.5 text-sm text-white">ดูรายละเอียด</Link> */}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
