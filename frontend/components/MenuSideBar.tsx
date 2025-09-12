"use client";

import Link from "next/link";
import React, { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { menus } from "@/constant/sidebarMenu";
import { mutate } from "swr";
import { useAuth } from "@/app/providers/AuthProvider";
import UpgradePlanModal from "./UpgradePlanModal";
import { prefetchPlan, usePlan } from "@/lib/plan";

const MenuSideBar = () => {
  const router = useRouter();
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  const basePath = `/` + segments[0];
  const { logout, ready } = useAuth();
  const [open, setOpen] = useState(false);
  const { data } = usePlan();

  const handleLogout = async () => {
    try {
      logout();
      mutate("/api/auth/me", null, false);
    } catch (e) {
      console.error("logout failed", e);
    } finally {
      router.replace("/login");
    }
  };

  const onOpen = async () => {
    if (!data) await prefetchPlan(); // preload รอบแรกเท่านั้น
    setOpen(true); // เปิดแล้วเห็นเลย
  };

  return (
    <aside className=" h-full w-1/7 min-w-[100px] border-r-1 border-gray-200">
      <div className="flex flex-col justify-between h-full px-4 py-4">
        <div>
          <div className="flex justify-between">
            <span>ICON</span>
            <button className="cursor-pointer hover:text-[#f49b50]">
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
                  d="m11.25 9-3 3m0 0 3 3m-3-3h7.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                />
              </svg>
            </button>
          </div>
          <ul className="">
            {menus.map((item) => {
              return (
                <li key={item.type} className="my-3 border-b-1">
                  <span className="font-bold">{item.title}</span>
                  {item.menu.map((m) => {
                    return (
                      <Link key={m.name} href={`${m.path}`}>
                        <div
                          className={`flex px-4 py-2 gap-2 items-center hover:bg-[#f2f2f2] hover:rounded-sm my-1 ${
                            m.path === basePath
                              ? "bg-[#fff0e4] rounded-sm "
                              : " "
                          }`}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                            className={`size-6 ${
                              m.path === basePath
                                ? "text-[#f49b50]"
                                : "text-gray-800"
                            }`}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d={m.icon}
                            />
                          </svg>
                          <span
                            className={`${
                              m.path === basePath
                                ? "text-[#f49b50]"
                                : "text-gray-800"
                            }`}
                          >
                            {m.name}
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </li>
              );
            })}
          </ul>
        </div>
        <ul className="border-t-1 pt-2">
          <button
            onClick={onOpen}
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:text-[#f49b50] focus:bg-red-50 focus:outline-none cursor-pointer"
          >
            <svg
              className="size-6"
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="m8.032 12 1.984 1.984 4.96-4.96m4.55 5.272.893-.893a1.984 1.984 0 0 0 0-2.806l-.893-.893a1.984 1.984 0 0 1-.581-1.403V7.04a1.984 1.984 0 0 0-1.984-1.984h-1.262a1.983 1.983 0 0 1-1.403-.581l-.893-.893a1.984 1.984 0 0 0-2.806 0l-.893.893a1.984 1.984 0 0 1-1.403.581H7.04A1.984 1.984 0 0 0 5.055 7.04v1.262c0 .527-.209 1.031-.581 1.403l-.893.893a1.984 1.984 0 0 0 0 2.806l.893.893c.372.372.581.876.581 1.403v1.262a1.984 1.984 0 0 0 1.984 1.984h1.262c.527 0 1.031.209 1.403.581l.893.893a1.984 1.984 0 0 0 2.806 0l.893-.893a1.985 1.985 0 0 1 1.403-.581h1.262a1.984 1.984 0 0 0 1.984-1.984V15.7c0-.527.209-1.031.581-1.403Z"
              />
            </svg>
            อัปเกรดบริการ
          </button>
          <UpgradePlanModal open={open} onClose={() => setOpen(false)} />
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:text-[#f49b50] focus:bg-red-50 focus:outline-none cursor-pointer"
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
                d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
              />
            </svg>
            Setting
          </button>
          <button
            type="button"
            tabIndex={0}
            onClick={handleLogout}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 focus:bg-red-50 focus:outline-none cursor-pointer"
          >
            <svg
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
              className="size-6"
            >
              <path
                d="M11 4H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h5M14 7l3 3-3 3M8 10h9"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            Logout
          </button>
        </ul>
      </div>
    </aside>
  );
};

export default MenuSideBar;
