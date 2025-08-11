"use client";

import Link from "next/link";
import React from "react";
import { useRouter, usePathname } from "next/navigation";

const MenuSideBar = () => {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  const basePath = segments[0];

  const menus = [
    { name: "Dashboard", path: "/" },
    { name: "Inventory", path: "/inventory" },
    { name: "Sale Channel", path: "/sale-channel" },
  ];
  return (
    <aside className=" h-full w-1/9 min-w-[100px] border-r-1 border-gray-200">
      <div className="mx-4 mt-4 ">
        <span>MENU</span>
      </div>
      <ul>
        {menus.map((menu) => {
          return (
            <li key={menu.name} className="my-3">
              <Link href={`${menu.path}`}>
                <div
                  className={`flex px-4 py-2 gap-2 items-center hover:bg-[#fff0e4] ${
                    menu.path === basePath
                      ? "bg-[#fff0e4] border-r-4 border-[#f49b50]"
                      : " "
                  }`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="size-6 text-gray-400 hover:text-[#ffc596]"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z"
                    />
                  </svg>
                  <span className="text-gray-400 hover:text-[#ffc596]">
                    {menu.name}
                  </span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </aside>
  );
};

export default MenuSideBar;
