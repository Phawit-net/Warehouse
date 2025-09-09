"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/providers/AuthProvider";

export default function LoginPage() {
  const { login, loading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPass] = useState("");
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      await login(email, password);
      const params = new URLSearchParams(window.location.search);
      const next = params.get("next") || "/dashboard";
      router.replace(next);
    } catch (e: any) {
      setErr("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm space-y-4 border rounded-2xl p-6 shadow"
      >
        <h1 className="text-xl font-semibold">เข้าสู่ระบบ</h1>
        {err && <div className="text-red-600 text-sm">{err}</div>}
        <div className="space-y-1">
          <label className="text-sm">อีเมล</label>
          <input
            className="border rounded w-full px-3 py-2"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm">รหัสผ่าน</label>
          <input
            className="border rounded w-full px-3 py-2"
            type="password"
            value={password}
            onChange={(e) => setPass(e.target.value)}
            required
          />
        </div>
        <button
          className="w-full rounded-lg py-2 border bg-black text-white disabled:opacity-50"
          disabled={loading}
        >
          {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
        </button>
      </form>
    </div>
  );
}
