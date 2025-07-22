// components/Table.js
import React, { useEffect, useState } from "react";
import IconsButton from "@/components/IconsButton";
import Image from "next/image";
import axios from "axios";

type Props = {
  headerColumns: HeaderColumn[];
  data: TableData[];
  onDelete: (id: number) => void;
};

const Table = ({ headerColumns, data, onDelete }: Props) => {
  const [detailId, setDetailId] = useState<string>("");
  const imageColumns = headerColumns.filter((col) => col.type === "image");
  const regularColumns = headerColumns.filter((col) => col.type === "display");
  const actionColumn = headerColumns.find((col) => col.type === "action");

  return (
    <div className="overflow-x-auto relative  ">
      <table className="w-full text-md text-left text-gray-600">
        <thead className="text-sm  text-gray-300 uppercase border-b border-b-gray-100">
          <tr>
            {headerColumns.map((column, index) => (
              <th
                key={index}
                scope="col"
                className={`w-${column.width} py-2 px-6 box-border font-medium`}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIndex) => {
            const images = row["images"] || [];
            const mainImage = images.find((img: any) => img.is_main);
            const imageUrl = mainImage
              ? `http://127.0.0.1:5001/api/inventory/uploads/${mainImage.filename}`
              : "/image/placeholder.jpg"; // fallback
            return (
              <React.Fragment key={rowIndex}>
                <tr
                  key={rowIndex}
                  className={`bg-white hover:bg-gray-50 border-gray-200 border-b-1 ${
                    detailId === row.id && "border-x-1 border-t-1"
                  }`}
                >
                  {imageColumns.map((column) => {
                    if (!mainImage) {
                      return (
                        <td
                          key={`${column.accessor}-${rowIndex}`}
                          className="py-2 px-6"
                        >
                          <div className="w-[50px] h-[50px] bg-gray-100 rounded-xl flex items-center justify-center text-xs text-gray-400">
                            ไม่มีรูป
                          </div>
                        </td>
                      );
                    }
                    const imageUrl = `http://127.0.0.1:5001/api/inventory/uploads/${mainImage.filename}`;

                    return (
                      <td
                        key={`${column.accessor}-${rowIndex}`}
                        className="py-2 px-6"
                      >
                        <div className="relative w-[50px] h-[50px] border-1 border-gray-300 rounded-xl">
                          <Image
                            className="object-contain p-2"
                            src={imageUrl}
                            alt="Product"
                            fill
                            sizes="auto"
                          />
                        </div>
                      </td>
                    );
                  })}

                  {regularColumns.map((column, colIndex) => (
                    <td
                      key={`${column.accessor}-${rowIndex}`} // key ที่รวม accessor และ rowIndex
                      className={`py-2 px-6`}
                    >
                      {row[column.accessor]}
                    </td>
                  ))}

                  {actionColumn && (
                    <td className={`py-2 px-6`}>
                      <div className="flex gap-2">
                        <IconsButton
                          type="edit"
                          color="blue"
                          handleClick={() => {
                            // setIsOpen(!isOpen);
                            setDetailId(row.id);
                          }}
                        />
                        <IconsButton
                          type="delete"
                          color="red"
                          handleClick={() => {
                            onDelete(row.id);
                          }}
                        />
                        <IconsButton type="import" color="blue" />
                        <IconsButton type="sale" color="red" />
                      </div>
                    </td>
                  )}
                </tr>

                {/* DETAIL CARD */}
                {detailId === row.id && (
                  <tr>
                    <td colSpan={headerColumns.length}>
                      <div className="py-4 px-6 grid grid-cols-3 mx-[-0.5] border-gray-200  border-l border-b border-r rounded-b-lg">
                        {mainImage && (
                          <div className="w-[150px] h-[150px] relative border-1 border-gray-200 rounded-2xl">
                            <Image
                              className="object-contain rounded-2xl bg-white p-2"
                              src={imageUrl}
                              alt="My Image"
                              fill
                              sizes="auto"
                            />
                          </div>
                        )}
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
                        <div>
                          <p>asdasd</p>
                        </div>
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
