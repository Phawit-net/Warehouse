"use client";
import React from "react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import useSWR, { mutate } from "swr";
import { swrFetcher } from "@/lib/api";
import { useAuth } from "@/app/providers/AuthProvider";
import { useRouter } from "next/navigation";

const UserAvatarMenu = () => {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();
  const { logout, ready } = useAuth();

  const { data: me, isLoading } = useSWR(
    ready ? "/api/auth/me" : null,
    swrFetcher,
    {
      revalidateOnMount: false, // ใช้ cache ที่ AuthProvider seed ไว้
      revalidateOnFocus: false, // ไม่ต้องล้างเมื่อสลับแท็บ (ถ้าอยากล้างค่อยเปิดทีหลัง)
      dedupingInterval: 10000, // กันยิงซ้ำในระยะสั้น (เผื่อมี component อื่นใช้คีย์เดียวกัน)
    }
  );

  const displayName = me?.user?.username ?? me?.user?.email ?? "-";
  const role = me?.role ? me.role.toLowerCase() : "";

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!menuRef.current || !btnRef.current) return;
      if (
        !menuRef.current.contains(e.target as Node) &&
        !btnRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // ปิดด้วย ESC
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const handleToggle = () => setOpen((v) => !v);

  const handleLogout = async () => {
    try {
      logout();
      mutate("/api/auth/me", null, false);
    } catch (e) {
      console.error("logout failed", e);
    } finally {
      router.replace("/login");
      setOpen(false);
    }
  };

  return (
    <div>
      <button
        ref={btnRef}
        type="button"
        onClick={handleToggle}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
            // โฟกัสไอเท็มแรกหลังเปิด
            setTimeout(() => {
              const first =
                menuRef.current?.querySelector<HTMLElement>(
                  '[role="menuitem"]'
                );
              first?.focus();
            }, 0);
          }
        }}
        className="relative border-1 rounded-sm w-10 h-10 cursor-pointer"
      >
        <Image
          className="object-contain rounded-sm"
          priority={true}
          src="/image/user.jpg"
          alt="user"
          fill
          sizes="auto"
        />
      </button>
      {/* Dropdown */}
      {open && (
        <div
          ref={menuRef}
          role="menu"
          aria-label="User menu"
          className="absolute right-0 mr-5 top-[55px] z-50  w-50 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg"
        >
          <div className="px-3 py-2">
            <div className="flex items-center gap-5">
              <div className="relative w-15 h-15 border-1 rounded-full">
                <Image
                  className="object-contain rounded-full"
                  priority={true}
                  src="/image/user.jpg"
                  alt="user"
                  fill
                  sizes="auto"
                />
              </div>
              <div>
                <p className="truncate text-lg font-medium text-gray-900">
                  {displayName}
                </p>
                <p className="truncate text-sm font-medium text-gray-900">
                  {role}
                </p>
              </div>
            </div>
            {/* {me.user.email ? (
              <p className="truncate text-xs text-gray-500">{me.user.email}</p>
            ) : null} */}
          </div>
          <div className="my-1 h-px bg-gray-100" />
          <Link
            href={"/profile"}
            role="menuitem"
            tabIndex={0}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
            onClick={() => setOpen(false)}
          >
            <svg viewBox="0 0 20 20" className="size-4" aria-hidden="true">
              <path
                d="M10 11a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-3.5 0-6 1.8-6 3v1h12v-1c0-1.2-2.5-3-6-3Z"
                fill="currentColor"
              />
            </svg>
            View profile
          </Link>
          <button
            type="button"
            role="menuitem"
            tabIndex={0}
            onClick={handleLogout}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 focus:bg-red-50 focus:outline-none cursor-pointer"
          >
            <svg viewBox="0 0 20 20" className="size-4" aria-hidden="true">
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
        </div>
      )}
    </div>
  );
};

export default UserAvatarMenu;
