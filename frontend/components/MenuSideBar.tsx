"use client";

import Link from "next/link";
import React from "react";
import { useRouter, usePathname } from "next/navigation";
import { menus } from "@/constant/sidebarMenu";

const MenuSideBar = () => {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  const basePath = `/` + segments[0];

  return (
    <aside className=" h-full w-1/7 min-w-[100px] border-r-1 border-gray-200">
      <div className="mx-4 mt-4 flex justify-between">
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
      <ul className="px-5">
        {menus.map((item) => {
          return (
            <li key={item.type} className="my-3 border-b-1">
              <span className="font-bold">{item.title}</span>
              {item.menu.map((m) => {
                return (
                  <Link key={m.name} href={`${m.path}`}>
                    <div
                      className={`flex px-4 py-2 gap-2 items-center hover:bg-[#f2f2f2] hover:rounded-sm my-1 ${
                        m.path === basePath ? "bg-[#fff0e4] rounded-sm " : " "
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
    </aside>
  );
};

export default MenuSideBar;
