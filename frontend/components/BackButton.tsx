"use client";
import React from "react";
import { useRouter } from "next/navigation";

type Props = {
  text: string;
  fallback?: string;
};

const BackButton = React.memo(({ text, fallback = "/" }: Props) => {
  const router = useRouter();

  const onClick = () => {
    // กันเคสเข้าหน้านี้โดยตรงแล้วกดย้อนกลับไม่ได้
    if (typeof window !== "undefined") {
      const sameOrigin =
        document.referrer && document.referrer.startsWith(location.origin);
      if (sameOrigin && window.history.length > 1) {
        router.back();
        return;
      }
    }
    router.replace(fallback); // ไปหน้าสำรองแทน
  };
  return (
    <button
      type="button"
      className="bg-[#092C4C] p-2 px-3 text-white flex justify-center items-center justify-items-center gap-2 rounded-sm"
      onClick={onClick}
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
          d="M6.75 15.75 3 12m0 0 3.75-3.75M3 12h18"
        />
      </svg>

      <span>{text}</span>
    </button>
  );
});

export default BackButton;
