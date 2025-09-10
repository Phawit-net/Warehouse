// app/(auth)/register/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { axiosInst } from "@/lib/api";
import { useAuth } from "@/app/providers/AuthProvider";
import Cookies from "js-cookie";

export default function RegisterPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [workspaceName, setWsName] = useState(""); // optional
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    // validate เบาๆ ฝั่ง FE
    if (!email.includes("@")) return setErr("อีเมลไม่ถูกต้อง");
    if (password.length < 8) return setErr("รหัสผ่านอย่างน้อย 8 ตัว");
    if (password !== confirm) return setErr("รหัสผ่านไม่ตรงกัน");

    try {
      setLoading(true);

      // 1) สมัคร (workspace_name เป็น optional)
      await axiosInst.post(
        "/api/auth/register-owner",
        {
          email,
          username,
          password,
          // ส่งเฉพาะถ้ามีค่า เพื่อลด edge case
          ...(workspaceName.trim()
            ? { workspace_name: workspaceName.trim() }
            : {}),
        },
        { _skipAuth: true }
      );

      // 2) auto-login
      await login(email, password);

      // 3) เช็ค me แล้วตัดสินใจปลายทาง + ตั้ง cookie ob
      const { data: me } = await axiosInst.get("/api/auth/me");
      const done = !!me?.onboarding?.done;

      if (done) {
        Cookies.set("ob", "1", { sameSite: "lax", path: "/" }); // onboarded แล้ว
        window.location.assign("/dashboard");
      } else {
        Cookies.remove("ob", { path: "/" }); // ยังไม่จบ onboarding
        window.location.assign("/onboarding");
      }
    } catch (e: any) {
      const msg =
        e?.response?.data?.error ||
        e?.message ||
        "สมัครไม่สำเร็จ ลองใหม่อีกครั้ง";
      setErr(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto p-6 space-y-5">
      <h1 className="text-2xl font-semibold">สมัครสมาชิก (OWNER)</h1>
      {err && <div className="text-sm text-red-600">{err}</div>}

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <label className="block text-sm">อีเมล</label>
          <input
            className="w-full border rounded px-3 py-2"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value.trim())}
            required
            autoComplete="email"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm">ชื่อผู้ใช้</label>
          <input
            className="w-full border rounded px-3 py-2"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoComplete="username"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-2">
            <label className="block text-sm">รหัสผ่าน</label>
            <input
              className="w-full border rounded px-3 py-2"
              type="password"
              value={password}
              onChange={(e) => setPass(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm">ยืนยันรหัสผ่าน</label>
            <input
              className="w-full border rounded px-3 py-2"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm">
            ชื่อร้าน / Workspace{" "}
            <span className="text-gray-400">(ใส่ทีหลังก็ได้)</span>
          </label>
          <input
            className="w-full border rounded px-3 py-2"
            value={workspaceName}
            onChange={(e) => setWsName(e.target.value)}
            placeholder="เช่น Healthy Shop"
          />
        </div>

        <button
          className="w-full rounded-lg py-2 bg-black text-white disabled:opacity-50"
          disabled={loading}
        >
          {loading ? "กำลังสมัคร..." : "สมัครสมาชิก"}
        </button>
      </form>

      <p className="text-sm text-gray-600">
        มีบัญชีแล้ว?{" "}
        <a href="/login" className="underline">
          เข้าสู่ระบบ
        </a>
      </p>
    </div>
  );
}
