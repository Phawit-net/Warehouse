// components/Table.js
import React, { useLayoutEffect, useRef, useState } from "react";
import IconsButton from "@/components/IconsButton";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { mutate } from "swr";
import { fetcher } from "@/lib/fetcher";

type Props = {
  headerColumns: HeaderColumn[];
  data: TableData[];
  handleDelete: (id: number) => Promise<void>;
};

const Table = ({ headerColumns, data, handleDelete }: Props) => {
  const router = useRouter();
  const pathname = usePathname();
  const [detailId, setDetailId] = useState<string>("");
  const detailRefs = useRef<Record<string, HTMLDivElement | undefined>>({});
  const [detailHeights, setDetailHeights] = useState<{ [key: string]: number }>(
    {}
  );

  const prefetchProduct = (id: string) => {
    mutate(
      `http://localhost:5001/api/inventory/${id}`,
      fetcher(`http://localhost:5001/api/inventory/${id}`)
    );
  };

  useLayoutEffect(() => {
    if (detailId && detailRefs.current[detailId]) {
      const el = detailRefs.current[detailId];
      setDetailHeights((prev) => ({
        ...prev,
        [detailId]: el?.scrollHeight || 0,
      }));
    }
  }, [detailId]);

  const totalVisualColumns = headerColumns.length;
  const getInnerGridColsClasses = () => {
    return `grid-cols-[0.7fr_1fr_3fr_1.5fr_1.5fr_1.5fr_1.5fr_1.2fr_0.4fr]`;
  };
  const innerGridColsClasses = getInnerGridColsClasses();
  const isFirstRowExpanded = detailId === data[0]?.id; // ตรวจสอบว่า Row แรกสุดมีการขยาย detail หรือไม่

  return (
    <div className="overflow-x-auto relative">
      <table className="w-full text-md text-left text-gray-600 mb-2">
        <thead
          className={`text-sm text-gray-300 uppercase transform transition-transform duration-300 
            ${isFirstRowExpanded ? "" : "border-b border-b-gray-100"}
          `}
        >
          <tr>
            <th colSpan={totalVisualColumns} scope="colgroup" className="p-0">
              <div className={`grid ${innerGridColsClasses} font-medium px-6`}>
                {headerColumns.map((column, index) => (
                  <div key={index} className="py-2">
                    {column.header}
                  </div>
                ))}
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIndex) => {
            const images = row["images"] || [];
            const mainImage = images.find((img: any) => img.is_main);
            const imageUrl = mainImage
              ? `http://127.0.0.1:5001/api/inventory/uploads/${mainImage.filename}`
              : "/image/placeholder.jpg";

            const isDetailExpanded = detailId === row.id;
            const indexExpanded = data.findIndex((row) => row.id === detailId);

            return (
              <React.Fragment key={rowIndex}>
                <tr>
                  <td colSpan={totalVisualColumns} className="p-0">
                    <div
                      className={`grid ${innerGridColsClasses} font-medium px-6 items-center border-gray-200  transform transition-transform duration-300 ${
                        indexExpanded === rowIndex
                          ? "border-b-1"
                          : indexExpanded - rowIndex !== 1
                          ? "border-b-1"
                          : ""
                      } ${
                        isDetailExpanded
                          ? "border-x-1 border-t rounded-t-sm shadow-sm"
                          : "border-x-1 border-x-white"
                      } `}
                    >
                      {headerColumns
                        .filter((col) => col.type === "image")
                        .map((column) => (
                          <div
                            key={`${column.accessor}-${rowIndex}`}
                            className="py-2"
                          >
                            {!mainImage ? (
                              <div className="w-[50px] h-[50px] bg-gray-100 rounded-sm flex items-center justify-center text-xs text-gray-400">
                                ไม่มีรูป
                              </div>
                            ) : (
                              <div className="relative w-[50px] h-[50px] border border-gray-300 rounded-sm">
                                <Image
                                  className="object-contain p-2"
                                  src={imageUrl}
                                  alt="Product"
                                  fill
                                  sizes="auto"
                                />
                              </div>
                            )}
                          </div>
                        ))}

                      {/* Regular Columns */}
                      {headerColumns
                        .filter((col) => col.type === "display")
                        .map((column, colIndex) => (
                          <div
                            key={`${column.accessor}-${rowIndex}`}
                            className="py-2"
                          >
                            {row[column.accessor]}
                          </div>
                        ))}

                      {/* Action Column */}
                      {headerColumns.find((col) => col.type === "action") && (
                        <div className="py-2">
                          <div className="flex gap-2">
                            {/* <IconsButton
                              type="edit"
                              color="blue"
                              onMouseEnter={() => prefetchProduct(row.id)}
                              handleClick={(e: {
                                stopPropagation: () => void;
                              }) => {
                                router.push(`${pathname}/edit/${row.id}`);
                              }}
                            /> */}
                            {/* <IconsButton
                              type="delete"
                              color="red"
                              handleClick={() => handleDelete(row.id)}
                            /> */}
                            <IconsButton
                              type="import"
                              color="blue"
                              onMouseEnter={() => prefetchProduct(row.id)}
                              handleClick={(e: {
                                stopPropagation: () => void;
                              }) => {
                                router.push(`${pathname}/stock-in/${row.id}`);
                              }}
                            />
                            <IconsButton
                              type="sale"
                              color="red"
                              onMouseEnter={() => prefetchProduct(row.id)}
                              handleClick={(e: {
                                stopPropagation: () => void;
                              }) => {
                                router.push(`${pathname}/sale/${row.id}`);
                              }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Collapse Column */}
                      <div className="py-2 justify-self-end">
                        <div className="flex gap-2">
                          <button
                            className="shadow-sm border-1 border-gray-200 rounded-2xl px-2 cursor-pointer"
                            onClick={(e: { stopPropagation: () => void }) => {
                              e.stopPropagation();
                              setDetailId(isDetailExpanded ? "" : row.id);
                            }}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth="0"
                              stroke="currentColor"
                              className={`size-5 transform transition-transform duration-300 ${
                                isDetailExpanded
                                  ? "rotate-180 fill-[#f49b50] stroke-[#f49b50]"
                                  : "stroke-gray-300  fill-gray-300 "
                              }`}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="m4.5 15.75 7.5-7.5 7.5 7.5"
                              />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>

                {/* DETAIL CARD */}
                <tr>
                  <td colSpan={totalVisualColumns} className="p-0">
                    <div
                      ref={(el) => {
                        detailRefs.current[row.id] = el ?? undefined;
                      }}
                      style={{
                        maxHeight: isDetailExpanded
                          ? `${detailHeights[row.id] || 999}px`
                          : "0px",
                        transition: "max-height 0.2s ease",
                        overflow: "hidden",
                      }}
                      className={`
                        transition-all duration-500
                        bg-white border-gray-200 rounded-b-sm
                     shadow-sm
                        ${!isDetailExpanded ? "" : "border-l border-r border-b"}
                      `}
                    >
                      <div
                        className={`px-6 grid grid-cols-3 border-b transition duration-200 ${
                          !isDetailExpanded ? "py-0" : "py-4"
                        }`}
                      >
                        {mainImage && (
                          <div className="w-[150px] h-[150px] relative border border-gray-200 rounded-sm">
                            <Image
                              className="object-contain rounded-sm bg-white p-2"
                              src={imageUrl}
                              alt="My Image"
                              fill
                              sizes="auto"
                            />
                          </div>
                        )}
                        <div className="flex flex-col gap-3">
                          <div className="bg-yellow-200">
                            <p className="text-xs">Display name</p>
                            <p className="border-b">{row.name}</p>
                          </div>
                          <div className="bg-pink-200 grid grid-cols-[1fr_2fr] gap-3">
                            <div>
                              <p className="text-xs">SKU</p>
                              <p className="border-b">{row.sku}</p>
                            </div>
                            <div>
                              <p className="text-xs">Category</p>
                              <p className="border-b">{row.category}</p>
                            </div>
                          </div>
                          <div className="bg-blue-200">
                            <p className="text-xs">Stock</p>
                            <p className="border-b">{row.sku}</p>
                          </div>
                        </div>
                        <p className="font-bold">รายละเอียดของ: </p>
                        <p>SKU: dd</p>
                        <p>หมวดหมู่: </p>
                      </div>
                      <div className="px-6 py-2 flex justify-between">
                        <button
                          type="button"
                          className={`cursor-pointer flex gap-1 items-center hover:text-[#f49b50]`}
                          onMouseEnter={() => prefetchProduct(row.id)}
                          onClick={(e: { stopPropagation: () => void }) => {
                            router.push(`${pathname}/edit/${row.id}`);
                          }}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            className={`h-6 w-6`}
                          >
                            <path
                              stroke="currentColor"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="1.5"
                              d="m14.304 4.844 2.852 2.852M7 7H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-4.5m2.409-9.91a2.017 2.017 0 0 1 0 2.853l-6.844 6.844L8 14l.713-3.565 6.844-6.844a2.015 2.015 0 0 1 2.852 0Z"
                            />
                          </svg>
                          <span className="text-sm font-semibold">
                            Advanced edit
                          </span>
                        </button>
                        <button
                          type="button"
                          className={`cursor-pointer flex gap-1 items-center hover:text-[#f49b50]`}
                          onClick={() => handleDelete(row.id)}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            className={`h-6 w-6`}
                          >
                            <path
                              stroke="currentColor"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="1.5"
                              d="M5 7h14m-9 3v8m4-8v8M10 3h4a1 1 0 0 1 1 1v3H9V4a1 1 0 0 1 1-1ZM6 7h12v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V7Z"
                            />
                          </svg>

                          <span className="text-sm font-semibold">
                            Delete Product
                          </span>
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default Table;
