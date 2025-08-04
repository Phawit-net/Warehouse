import React from "react";
import Image from "next/image";
import IconsButton from "@/components/IconsButton";

type Props = {
  headerColumns: HeaderColumn[];
  data: TableData[];
  handleDelete: (id: number) => Promise<void>;
};

const Table = ({ headerColumns, data, handleDelete }: Props) => {
  const totalVisualColumns = headerColumns.length;
  const getInnerGridColsClasses = () => {
    return `grid-cols-[1fr_1fr_1.5fr_1fr_1.5fr_0.5fr]`;
  };
  const innerGridColsClasses = getInnerGridColsClasses();

  return (
    <div className="overflow-x-auto relative">
      <table className="w-full text-md text-left text-gray-600 mb-2">
        <thead
          className={`text-sm text-gray-300 uppercase transform transition-transform duration-300 border-b border-gray-200 `}
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
            const images = row["image_filename"] || [];
            const imageUrl = images
              ? `http://127.0.0.1:5001/api/stock-in/uploads/receipts/${images}`
              : "/image/placeholder.jpg"; // fallback
            return (
              <React.Fragment key={rowIndex}>
                <tr
                  key={rowIndex}
                  className={`bg-white hover:bg-gray-50 border-gray-200 border-b-1 `}
                >
                  <td className="p-0">
                    <div
                      className={`grid ${innerGridColsClasses} font-medium px-6 items-top border-gray-200  transform transition-transform duration-300 border-x-1 border-x-white`}
                    >
                      {headerColumns.map((column) => {
                        if (column.type === "display") {
                          if (column.accessor === "entries") {
                            return (
                              <div
                                key={`${column.accessor}-${rowIndex}`}
                                className="py-2"
                              >
                                {row[column.accessor].map(
                                  (item: Entries, itemIdx: number) => {
                                    return (
                                      <div
                                        key={`${column.accessor}-${itemIdx}`}
                                      >
                                        {item.sale_mode}
                                        {` (${item.pack_size}) `}x{" "}
                                        {item.quantity}
                                      </div>
                                    );
                                  }
                                )}
                              </div>
                            );
                          } else
                            return (
                              <div
                                key={`${column.accessor}-${rowIndex}`}
                                className="py-2"
                              >
                                {row[column.accessor]}
                              </div>
                            );
                        } else if (column.type === "image")
                          return (
                            <div
                              key={`${column.accessor}-${rowIndex}`}
                              className="py-2"
                            >
                              {!images ? (
                                <div className="w-[50px] h-[50px] bg-gray-100 rounded-xl flex items-center justify-center text-xs text-gray-400">
                                  ไม่มีรูป
                                </div>
                              ) : (
                                <div className="relative w-[50px] h-[50px] border border-gray-300 rounded-xl">
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
                          );
                        else if (column.type === "action")
                          return (
                            <div
                              key={`${column.accessor}-${rowIndex}`}
                              className="py-2"
                            >
                              <div className="flex gap-2">
                                <IconsButton
                                  type="edit"
                                  color="blue"
                                  handleClick={() => handleDelete(row.id)}
                                />
                                <IconsButton
                                  type="import"
                                  color="blue"
                                  handleClick={() => console.log("CLICK")}
                                />
                              </div>
                            </div>
                          );
                      })}
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
