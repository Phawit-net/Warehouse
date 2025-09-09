// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { nextUrl, cookies } = req;

  // คุกกี้เบาๆ ที่ฝั่ง FE จะตั้งหลัง login (ไม่ใช่ security)
  const hasSession = cookies.get("hasSession")?.value === "1";

  // ระบุ path ที่ต้องการป้องกัน (เพิ่มได้ตามจริง)
  const protectedPaths = ["/dashboard", "/inventory", "/sale-channel"];
  const isProtected = protectedPaths.some((p) =>
    nextUrl.pathname.startsWith(p)
  );

  // 1) ถ้าเข้าเพจ protected แต่ยังไม่มี session → เด้งไป /login?next=...
  if (isProtected && !hasSession) {
    const url = nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", nextUrl.pathname + nextUrl.search);
    return NextResponse.redirect(url);
  }

  // 2) ถ้าล็อกอินแล้ว แต่ดันเข้า /login → ส่งกลับ dashboard
  if (hasSession && nextUrl.pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  return NextResponse.next();
}

// จำกัดเฉพาะเพจที่สนใจ (เลี่ยง static assets)
export const config = {
  matcher: [
    "/login",
    "/dashboard/:path*",
    "/inventory/:path*",
    "/sale-channel/:path*",
  ],
};
