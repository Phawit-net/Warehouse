"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { axiosInst } from "@/lib/api";
import { useMe } from "@/lib/swr";
import Cookies from "js-cookie";

export default function OnboardingPage() {
  const { me, loading, mutate } = useMe();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const done = me?.onboarding?.done;

  useEffect(() => {
    if (!loading && done) {
      Cookies.set("ob", "1", { sameSite: "lax", path: "/" });
      // แล้วค่อยไป dashboard
      window.location.assign("/dashboard"); // ใช้ assign กัน race
    }
  }, [loading, done]);

  async function setWorkspaceName() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await axiosInst.post("/api/workspace/name", { name });
      // auto create default warehouse
      await axiosInst.post("/api/workspace/ensure-default-warehouse");
      await mutate(); // refresh /me
      Cookies.set("ob", "1", { sameSite: "lax", path: "/" });

      window.location.assign("/dashboard");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-6">กำลังตรวจสอบ...</div>;

  return (
    <div className="max-w-xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">ตั้งค่าร้านของคุณ</h1>

      {!me?.onboarding?.workspace_name_set && (
        <div className="space-y-3">
          <label className="block text-sm">ชื่อร้าน / Workspace</label>
          <input
            className="w-full border rounded px-3 py-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="เช่น Healthy Shop"
          />
          <button
            onClick={setWorkspaceName}
            disabled={saving || !name.trim()}
            className="px-4 py-2 rounded bg-black text-white disabled:opacity-50"
          >
            บันทึกและสร้างคลังแรกอัตโนมัติ
          </button>
        </div>
      )}

      {me?.onboarding?.workspace_name_set &&
        !me?.onboarding?.has_default_warehouse && (
          <div className="space-y-3">
            <div>กำลังสร้างคลังแรกให้…</div>
            <button
              onClick={async () => {
                await axiosInst.post("/api/workspace/ensure-default-warehouse");
                await mutate();
                Cookies.set("ob", "1", { sameSite: "lax", path: "/" });

                window.location.assign("/dashboard");
              }}
              className="px-4 py-2 rounded bg-black text-white"
            >
              ดำเนินการต่อ
            </button>
          </div>
        )}
    </div>
  );
}
