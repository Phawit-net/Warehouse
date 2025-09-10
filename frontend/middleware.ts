// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { nextUrl, cookies } = req;

  const truthy = (v?: string) => v === "1" || v === "true" || v === "yes";
  const hasSession = truthy(cookies.get("hasSession")?.value);
  const onboarded = truthy(cookies.get("ob")?.value);

  const pathname = nextUrl.pathname;

  // ระบุ path ที่ต้องการป้องกัน (เพิ่มได้ตามจริง)
  const protectedPaths = ["/dashboard", "/inventory", "/sale-channel"];
  const isProtected = protectedPaths.some((p) =>
    nextUrl.pathname.startsWith(p)
  );

  // 1) ถ้ายังไม่ล็อกอิน → กันเพจ protected + onboarding
  if (!hasSession) {
    if (isProtected || pathname === "/onboarding") {
      const url = nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", pathname + nextUrl.search);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // 2) ถ้าล็อกอินแล้วแต่ยังไม่ onboarded:
  //    - เข้า /login → เด้งออก
  //    - เข้าเพจ protected หรือ /dashboard → ส่งไป /onboarding
  //    - เข้า /onboarding เอง → ปล่อยผ่าน
  if (hasSession && !onboarded) {
    if (pathname === "/login") {
      return NextResponse.redirect(new URL("/onboarding", nextUrl));
    }
    if (isProtected || pathname === "/dashboard") {
      const url = nextUrl.clone();
      url.pathname = "/onboarding";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  if (
    hasSession &&
    onboarded &&
    (pathname === "/onboarding" || pathname === "/login")
  ) {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  return NextResponse.next();
}

// จำกัดเฉพาะเพจที่สนใจ (เลี่ยง static assets)
export const config = {
  matcher: [
    "/login",
    "/register",
    "/dashboard/:path*",
    "/onboarding",
    "/inventory/:path*",
    "/sale-channel/:path*",
  ],
};
