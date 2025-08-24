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
    <aside className=" h-full w-1/8 min-w-[100px] border-r-1 border-gray-200">
      <div className="mx-4 mt-4 ">
        <span>ICON</span>
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
