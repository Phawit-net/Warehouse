// components/Table.js
import React, { useEffect, useState } from "react";
import IconsButton from "./IconsButton";
import Image from "next/image";

type Props = {
  headerColumns: HeaderColumn[];
  data: TableData[];
};

const Table = ({ headerColumns, data }: Props) => {
  // const [isOpen, setIsOpen] = useState<boolean>(false);
  const [detailId, setDetailId] = useState<string>("");
  const regularColumns = headerColumns.filter((col) => col.type === "display");
  const selectColumns = headerColumns.filter((col) => col.type === "select");
  const actionColumn = headerColumns.find((col) => col.type === "action");
  const [selectedVariantIndexes, setSelectedVariantIndexes] = useState<
    number[]
  >(() =>
    data.map((row) => {
      const index = row.variants.findIndex(
        (variant) => variant.sale_mode === "แพ็ค"
      );
      return index !== -1 ? index : 0; // ถ้ามี "แพ็ค" ก็ใช้ index นั้น ไม่งั้นใช้ index 0
    })
  );

  useEffect(() => {
    if (data.length > 0) {
      const defaultIndexes = data.map((row) => {
        const index = row.variants.findIndex(
          (variant) => variant.sale_mode === "แพ็ค"
        );
        return index !== -1 ? index : 0;
      });
      setSelectedVariantIndexes(defaultIndexes);
    }
  }, [data]);

  const handleVariantChange = (rowIndex: number, newIndex: number) => {
    const updated = [...selectedVariantIndexes];
    updated[rowIndex] = newIndex;
    setSelectedVariantIndexes(updated);
  };

  return (
    <div className="overflow-x-auto relative shadow-md sm:rounded-lg border-1">
      <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
        <thead className="text-xs text-gray-700 uppercase dark:bg-gray-700 dark:text-gray-400 border-b border-b-gray-100">
          <tr>
            {headerColumns.map((column, index) => (
              <th key={index} scope="col" className="py-3 px-6 text-gray-400">
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIndex) => {
            const variants = row.variants;
            console.log("--", variants);
            return (
              <React.Fragment key={rowIndex}>
                <tr
                  key={rowIndex}
                  className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  {regularColumns.map((column, colIndex) => (
                    <td
                      key={`${column.accessor}-${rowIndex}`} // key ที่รวม accessor และ rowIndex
                      className={`py-4 px-6`}
                    >
                      {row[column.accessor]}
                    </td>
                  ))}
                  {selectColumns.map((column, colIndex) => {
                    const selectedVariant =
                      variants?.[selectedVariantIndexes[rowIndex]];

                    return (
                      <td
                        key={`${column.accessor}-${rowIndex}`}
                        className="py-4 px-6"
                      >
                        {column.accessor === "sale_mode" ? (
                          // 🔻 กรณี column เป็น "sale_mode" ให้ใช้ dropdown
                          <select
                            className="border rounded px-2 py-1 text-sm"
                            value={selectedVariant?.sale_mode}
                            onChange={(e) => {
                              const selectedIndex = variants.findIndex(
                                (v) => v.sale_mode === e.target.value
                              );
                              handleVariantChange(rowIndex, selectedIndex);
                            }}
                          >
                            {variants.map((v, idx) => (
                              <option key={idx} value={v.sale_mode}>
                                {v.sale_mode}
                              </option>
                            ))}
                          </select>
                        ) : (
                          // ✅ คอลัมน์อื่น ๆ แสดงค่าจาก variant ที่เลือก
                          <span>{selectedVariant?.[column.accessor]}</span>
                        )}
                      </td>
                    );
                  })}
                  {actionColumn && (
                    <td className={`py-4 px-6`}>
                      <div className="flex gap-2">
                        <IconsButton
                          type="edit"
                          color="blue"
                          handleClick={() => {
                            // setIsOpen(!isOpen);
                            setDetailId(row.name);
                            console.log(row.name);
                          }}
                        />
                        <IconsButton type="delete" color="red" />
                        <IconsButton type="import" color="blue" />
                        <IconsButton type="sale" color="red" />
                      </div>
                    </td>
                  )}
                </tr>

                {/* DETAIL CARD */}
                {detailId === row.name && (
                  <tr>
                    <td
                      colSpan={headerColumns.length}
                      className="py-4 px-6 bg-gray-50"
                    >
                      {/* ใส่ component แสดงรายละเอียด เช่น Card หรือ Form */}
                      <div className="p-4 border rounded bg-red-200 shadow grid grid-cols-3">
                        <div className="w-[150px] h-[150px] relative border-1 border-gray-200 rounded-2xl">
                          <Image
                            className="object-contain rounded-2xl"
                            src="/image/retinol.webp"
                            alt="My Image"
                            fill
                            sizes="auto"
                          />
                        </div>
                        <div className="bg-green-200 flex flex-col gap-3">
                          <div className="bg-yellow-200">
                            <p className="text-xs">Display name</p>
                            <p className="border-b-1">{row.name}</p>
                          </div>
                          <div className="bg-pink-200 grid grid-cols-[1fr_2fr] gap-3">
                            <div>
                              <p className="text-xs">SKU</p>
                              <p className="border-b-1">{row.sku}</p>
                            </div>
                            <div>
                              <p className="text-xs">Category</p>
                              <p className="border-b-1">{row.category}</p>
                            </div>
                          </div>
                          <div className="bg-blue-20">
                            <p className="text-xs">Stock</p>
                            <p className="border-b-1">{row.sku}</p>
                          </div>
                        </div>
                        <p className="font-bold">รายละเอียดของ: </p>
                        <p>SKU: dd</p>
                        <p>หมวดหมู่: </p>
                        {/* หรือจะใส่ <ProductDetailCard item={row} /> ก็ได้ */}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default Table;
