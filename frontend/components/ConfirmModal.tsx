import React from "react";
type Props = {
  show: boolean;
  message: string;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
};

const ConfirmModal = ({ message, onConfirm, onCancel, show }: Props) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl text-center">
        <p className="text-lg mb-4">{message}</p>
        <div className="flex justify-center gap-4">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 transition"
          >
            ยกเลิก
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition"
          >
            ยืนยันการลบ
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
