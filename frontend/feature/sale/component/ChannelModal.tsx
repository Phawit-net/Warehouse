import Modal from "@/components/Modal";
import TextInput from "@/components/TextInput";
import axios from "axios";
import { fetcher } from "@/lib/fetcher";
import React, { useCallback } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import useSWR from "swr";
import { salesChannelHeaderColumn } from "@/constant";
import IconsButton from "@/components/IconsButton";

type SalesChannel = {
  channel_name: string;
  commission_percent: number;
  transaction_percent: number;
  [key: string]: string | number;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  salesChannel: SalesChannel[];
};

const ChannelModal = ({ isOpen, onClose, title, salesChannel }: Props) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SalesChannel>({
    defaultValues: {},
  });

  const buildFormData = useCallback((data: SalesChannel): FormData => {
    const formData = new FormData();
    formData.append("channel_name", data.channel_name);
    formData.append("commission_percent", data.commission_percent.toString());
    formData.append("transaction_percent", data.transaction_percent.toString());
    return formData;
  }, []);

  const onSubmit: SubmitHandler<SalesChannel> = async (data: SalesChannel) => {
    console.log("data", data);
    const formData = buildFormData(data);

    try {
      await axios.post("http://localhost:5001/api/channel", formData);
    } catch (error) {
      console.error("❌ Upload failed:", error);
    }
  };

  const totalVisualColumns = salesChannelHeaderColumn.length;

  return (
    <div>
      <form id="add-sale-channel" onSubmit={handleSubmit(onSubmit)}>
        <Modal isOpen={isOpen} onClose={onClose} title={title}>
          <div className=" border-y py-4">
            <TextInput
              placeholder="ชื่อช่องทาง"
              name="channel_name"
              label="ชื่อช่องทาง"
              register={register}
              type="text"
            />
            <TextInput
              placeholder="ค่าธรรมเนียมการขาย(%)"
              name="commission_percent"
              label="ค่าธรรมเนียมการขาย(%)"
              register={register}
              type="number"
              float
            />
            <TextInput
              placeholder="ค่าธุรกรรมการชำระเงิน(%)"
              name="transaction_percent"
              label="ค่าธุรกรรมการชำระเงิน(%)"
              register={register}
              type="number"
              float
            />
            <button
              type="submit"
              form="add-sale-channel"
              className="bg-[#f49b50] text-white p-2 rounded"
            >
              เพิ่มช่องทาง
            </button>
          </div>
          <table className="w-full text-md text-left">
            <thead className="text-sm uppercase border-b">
              <tr>
                <th
                  colSpan={totalVisualColumns}
                  scope="colgroup"
                  className="p-0"
                >
                  <div
                    className={`grid grid-cols-[0.6fr_1fr_1fr_0.4fr] font-medium px-4`}
                  >
                    {salesChannelHeaderColumn.map((column, index) => (
                      <div key={index} className="py-2 ">
                        {column.header}
                      </div>
                    ))}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {salesChannel.map((row, rowIndex) => {
                return (
                  <React.Fragment key={rowIndex}>
                    <tr
                      key={rowIndex}
                      className={`bg-white hover:bg-gray-50 border-gray-200 border-b-1 `}
                    >
                      <td colSpan={totalVisualColumns} className="p-0">
                        <div
                          className={`grid grid-cols-[0.6fr_1fr_1fr_0.4fr] font-medium px-4`}
                        >
                          {/* {salesChannelHeaderColumn
                            .filter((col) => col.type === "display")
                            .map((column) => (
                              <div
                                key={`${column.accessor}-${rowIndex}`}
                                className="py-2 "
                              >
                                {row[column.accessor]}
                              </div>
                            ))} */}

                          <div className="py-2">{row["channel_name"]}</div>
                          <div className="py-2 justify-self-center">
                            {row["commission_percent"]}
                          </div>
                          <div className="py-2  justify-self-center">
                            {row["transaction_percent"]}
                          </div>

                          {salesChannelHeaderColumn.find(
                            (col) => col.type === "action"
                          ) && (
                            <div className="py-2">
                              <div className="flex gap-2">
                                <IconsButton
                                  type="delete"
                                  color="red"
                                  handleClick={() => console.log("CLICK")}
                                />
                                <IconsButton
                                  type="delete"
                                  color="blue"
                                  handleClick={() => console.log("CLICK")}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </Modal>
      </form>
    </div>
  );
};

export default ChannelModal;
