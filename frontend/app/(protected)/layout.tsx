"use client";
import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/app/providers/AuthProvider";
import MenuSideBar from "@/components/MenuSideBar";
import Navbar from "@/components/Navbar";

function hasCookie(name: string) {
  if (typeof document === "undefined") return false;
  return document.cookie.includes(`${name}=`);
}

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { accessToken, refresh } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // พยายาม refresh/redirect แค่ครั้งเดียวต่อ "เส้นทาง"
  const tried = useRef(false);

  useEffect(() => {
    // เปลี่ยนหน้าใหม่ → อนุญาตพยายามใหม่อีกรอบ
    tried.current = false;
  }, [pathname]);

  useEffect(() => {
    if (accessToken) return;

    if (tried.current) return;
    tried.current = true;

    const hasCsrf = hasCookie("csrf_refresh_token");
    const goLogin = () =>
      router.replace(
        `/login?next=${encodeURIComponent(pathname || "/dashboard")}`
      );

    // ไม่มีทั้ง access และ csrf → ไป login เลย
    if (!accessToken && !hasCsrf) {
      goLogin();
      return;
    }
  }, [accessToken, pathname, router]);

  // เรนเดอร์ shell ไปเลย (ลดอาการแฟลช) — ฟอร์ม/เพจย่อยให้ใช้ axiosInst (interceptor) จัดการ 401 เอง
  return (
    <div className="min-h-screen flex">
      <MenuSideBar />
      <div className="flex-1">
        <Navbar />
        <main className="flex-1 overflow-y-auto h-full">{children}</main>
      </div>
    </div>
  );
}
