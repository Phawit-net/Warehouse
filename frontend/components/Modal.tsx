import React from "react";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title: string;
};

const Modal = ({ isOpen, onClose, children, title }: Props) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/50">
      <div className="absolute inset-0" onClick={onClose} />

      <div
        className={`z-50 max-w-xl w-full bg-white rounded-xl px-6 shadow-lg relative mr-2 h-[98%]`}
        onClick={(e) => e.stopPropagation()} // ป้องกันคลิกด้านใน modal แล้ว modal ปิด
      >
        <div className="flex justify-between py-4 items-center">
          <h2 className="text-xl font-semibold">{title}</h2>
          <button
            type="button"
            className="text-gray-500 hover:text-gray-700"
            onClick={onClose}
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
                d="M6 18 18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

export default Modal;
