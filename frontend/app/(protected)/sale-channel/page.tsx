"use client";
import React, { useCallback } from "react";
import Form from "@/feature/saleChannel/component/Form";
import AddButton from "@/components/PrimaryButton";
import { useRouter, usePathname } from "next/navigation";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";

const SaleChannelPage = () => {
  const router = useRouter();
  const pathname = usePathname();

  const {
    data: myStore,
    error,
    mutate,
    isLoading,
  } = useSWR(`http://localhost:5001/api/channel`, fetcher);

  console.log(myStore);

  const handleClick = useCallback(() => {
    router.push(`${pathname}/add`);
  }, []);

  return (
    <main className="min-h-screen">
      <div className="flex">
        <div className="flex-grow p-10 w-6/7">
          <div className="flex items-end justify-between mb-4">
            <h1 className="text-2xl font-bold">ช่องทางการขาย (ร้านค้า)</h1>
            <AddButton text={"เพิ่มร้านค้า"} handleClick={handleClick} />
          </div>
          <div className="grid grid-cols-4 gap-10 p-5">
            {myStore?.map((store: Channel) => {
              return (
                <div
                  key={store.id}
                  className={`bg-white border-1 rounded-sm shadow-md p-3 ${
                    store.platform_name === "Shopee"
                      ? "hover:bg-[#ffae9e] transition-all duration-75 ease-in"
                      : store.platform_name === "TikTok"
                      ? "hover:bg-[#ffa6c2] transition-all duration-75 ease-in"
                      : "hover:bg-[#9ebeff] transition-all duration-75 ease-in"
                  }`}
                >
                  <div
                    className={`font-bold ${
                      store.platform_name === "Shopee"
                        ? "text-[#EE4D2D]"
                        : store.platform_name === "TikTok"
                        ? "text-[#ff0050]"
                        : "text-[#0044cd]"
                    }`}
                  >
                    {store.platform_name}
                  </div>
                  <div className="font-semibold">{store.channel_name}</div>
                  <div className="text-gray-400">{store.store_desc}</div>
                  <div className="font-semibold">
                    % ค่า commission : {store.commission_percent}
                  </div>
                  <div className="font-semibold">
                    % ค่า transaction : {store.transaction_percent}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
};

export default SaleChannelPage;
