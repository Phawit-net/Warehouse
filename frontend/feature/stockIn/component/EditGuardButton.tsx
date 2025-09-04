"use client";
import { useEffect, useState } from "react";

type Props = {
  locked: boolean;
  reason?: string;
  onProceed: () => void;
  className?: string;
  label?: string;
};

export default function EditGuardButton({
  locked,
  reason = "รายการนี้ถูกล็อกเพราะมีการเคลื่อนไหว (เช่น มีการขายออก) จึงไม่สามารถแก้ไขได้",
  onProceed,
  className = "",
  label = "Edit",
}: Props) {
  const [open, setOpen] = useState(false);

  const handleClick = () => {
    if (locked) setOpen(true);
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
          (locked
            ? "text-gray-500 hover:text-[#f49b50]"
            : "text-gray-800  hover:text-[#f49b50]") +
          " " +
          className
        }
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={locked ? "ดูสาเหตุที่แก้ไม่ได้" : "แก้ไข"}
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
        {locked && (
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
            <div className="flex items-start gap-3">
              <div className="mt-1 rounded-full bg-yellow-100 p-2 text-yellow-700">
                <svg viewBox="0 0 20 20" className="size-5" aria-hidden="true">
                  <path
                    d="M10 3.5l7 12H3l7-12zM10 8v4M10 14h.01"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-base font-semibold">
                  ไม่สามารถแก้ไขรายการนี้
                </h2>
                <p className="mt-1 text-sm text-gray-700">{reason}</p>
              </div>
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
