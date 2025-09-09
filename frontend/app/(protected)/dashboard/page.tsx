"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/app/providers/AuthProvider";

export default function Dashboard() {
  // const { accessToken, fetchWithAuth, logout } = useAuth();
  // const [text, setText] = useState("loading...");

  // useEffect(() => {
  //   if (!accessToken) return; // ⬅️ รอมี access ก่อน
  //   (async () => {
  //     const res = await fetchWithAuth(
  //       `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/auth/me`
  //     );
  //     if (!res.ok) return setText("unauthorized");
  //     const data = await res.json();
  //     setText(`สวัสดี ${data.user.email} / role: ${data.role}`);
  //   })();
  // }, [accessToken, fetchWithAuth]); // ⬅️ ผูกกับ accessToken แทนรันทันที

  return (
    <div className="p-6 space-y-4">
      {/* <div>{text}</div>
      <button onClick={logout} className="border rounded px-3 py-1">
        ออกจากระบบ
      </button> */}
    </div>
  );
}
