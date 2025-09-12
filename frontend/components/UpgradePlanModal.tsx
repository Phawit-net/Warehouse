"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePlan } from "@/lib/plan";
import { axiosInst } from "@/lib/api";

type PlanInfo = {
  plan: "FREE" | "PRO" | "ENTERPRISE";
  limits: {
    max_warehouses: number | null;
    max_members_non_owner: number | null;
    features: Record<string, boolean>;
  };
  usage: { warehouses: number; members_non_owner: number };
};

export default function UpgradePlanModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const { data: info, mutate } = usePlan();

  useEffect(() => setMounted(true), []);

  // ❗ ล็อกสกรอลพื้นหลังเมื่อเปิดเต็มจอ
  useEffect(() => {
    if (!mounted) return;
    const original = document.body.style.overflow;
    if (open) document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open, mounted]);

  const upgrade = async (to: "PRO" | "ENTERPRISE") => {
    await axiosInst.post("/api/workspace/upgrade", { to });
    await mutate(); // ✅ รีเฟรช cache แค่ครั้งเดียวหลังอัปเกรด
  };

  if (!mounted || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100]">
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      {/* dialog full screen */}
      <div className="absolute inset-0 w-screen h-screen bg-white flex flex-col">
        {/* header sticky */}
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur px-4 md:px-8 py-3 flex items-center justify-end">
          <button
            onClick={onClose}
            className="rounded p-2 hover:bg-gray-100"
            aria-label="close"
          >
            ✕
          </button>
        </div>

        {/* content scrollable */}
        <div className="flex-1 overflow-auto px-4 md:px-8 py-6">
          {loading && <div className="text-gray-500">กำลังโหลด...</div>}
          {err && <div className="text-red-600 text-sm mb-3">{err}</div>}

          {info && (
            <div className="mx-auto max-w-3xl space-y-10">
              {/* toggle เหมือนภาพตัวอย่าง */}
              <div className="text-center">
                <h1 className="mt-3 text-3xl md:text-4xl font-semibold">
                  อัปเกรดบริการของคุณ
                </h1>
              </div>

              <div className="grid md:grid-cols-2 gap-10">
                <Card
                  title="Free"
                  price="$0"
                  current={info.plan === "FREE"}
                  buttonLabel="บริการปัจจุบันของคุณ"
                  buttonDisabled
                  features={[
                    { label: "ฟีเจอร์พื้นฐานครบ", ok: true },
                    { label: "1 ร้าน / 1 คลัง", ok: true },
                    { label: "เพิ่มสมาชิก (ADMIN/STAFF)", ok: false },
                    { label: "รายงานละเอียด", ok: false },
                  ]}
                />

                <Card
                  title="Pro"
                  price="$200"
                  current={info.plan === "PRO"}
                  buttonLabel={
                    info.plan === "PRO"
                      ? "กำลังใช้งาน Pro"
                      : saving
                      ? "กำลังอัปเกรด..."
                      : "รับ Pro"
                  }
                  onClick={() => upgrade("PRO")}
                  features={[
                    { label: "สมาชิกเพิ่มได้รวม 5 คน", ok: true },
                    { label: "1 ร้าน / 3 คลัง", ok: true },
                    { label: "ปลดล็อกฟีเจอร์หลักทั้งหมด", ok: true },
                    { label: "สิทธิ์ตามบทบาท", ok: true },
                  ]}
                  footer={
                    <Usage
                      warehouses={{
                        used: info.usage.warehouses,
                        limit: info.limits.max_warehouses,
                      }}
                      members={{
                        used: info.usage.members_non_owner,
                        limit: info.limits.max_members_non_owner,
                      }}
                    />
                  }
                />
              </div>

              <p className="text-center text-xs text-gray-500">
                * หน้าจอจำลองเพื่อทดสอบฟลูโฟลว์แผนราคา ยังไม่เชื่อมจ่ายเงินจริง
              </p>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

function Card({
  title,
  price,
  current,
  buttonLabel,
  buttonDisabled,
  onClick,
  features,
  footer,
}: {
  title: string;
  price: string;
  current?: boolean;
  buttonLabel: string;
  buttonDisabled?: boolean;
  onClick?: () => void;
  features: { label: string; ok: boolean }[];
  footer?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border p-6 bg-white shadow-sm">
      <div className="flex items-start justify-between">
        <h3 className="text-2xl font-semibold">{title}</h3>
        {current && (
          <span className="text-xs bg-gray-100 border rounded-full px-2 py-1">
            บริการปัจจุบันของคุณ
          </span>
        )}
      </div>
      <div className="mt-4 flex items-end gap-2">
        <div className="text-4xl font-semibold">{price}</div>
        <div className="text-gray-500">USD / เดือน</div>
      </div>
      <button
        disabled={buttonDisabled || current}
        onClick={onClick}
        className={`mt-5 w-full rounded-full py-2 ${
          buttonDisabled || current
            ? "bg-gray-100 text-gray-500"
            : "bg-black text-white hover:opacity-90"
        }`}
      >
        {buttonLabel}
      </button>
      <ul className="mt-6 space-y-3 text-sm">
        {features.map((f, i) => (
          <li key={i} className="flex items-start gap-2">
            <span
              className={`mt-1 inline-block h-4 w-4 rounded-full border ${
                f.ok ? "bg-black border-black" : "bg-white border-gray-300"
              }`}
            />
            <span className={f.ok ? "" : "text-gray-500 line-through"}>
              {f.label}
            </span>
          </li>
        ))}
      </ul>
      {footer && (
        <div className="mt-6 rounded-lg border p-3 text-sm">{footer}</div>
      )}
    </div>
  );
}

function Usage({
  warehouses,
  members,
}: {
  warehouses: { used: number; limit: number | null };
  members: { used: number; limit: number | null };
}) {
  return (
    <div className="space-y-2">
      <Bar label="คลัง" used={warehouses.used} limit={warehouses.limit} />
      <Bar
        label="สมาชิก (ไม่รวม OWNER)"
        used={members.used}
        limit={members.limit}
      />
    </div>
  );
}

function Bar({
  label,
  used,
  limit,
}: {
  label: string;
  used: number;
  limit: number | null;
}) {
  const max = limit ?? Math.max(used, 5);
  const pct = Math.min(100, Math.round((used / max) * 100));
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span>{label}</span>
        <span className="text-gray-600">
          {used} / {limit ?? "∞"}
        </span>
      </div>
      <div className="h-2 rounded bg-gray-100">
        <div className="h-2 rounded bg-black" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
