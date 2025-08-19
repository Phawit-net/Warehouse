import { format } from "date-fns";

export function fmtISODateOrNull(d?: Date | null): string | null {
  if (!d) return null;
  // แนะนำส่ง 'yyyy-MM-dd' ให้ backend (รับ dd/MM/yyyy ได้ด้วย แต่ format นี้ชัวร์สุด)
  return format(d, "yyyy-MM-dd");
}

export function toIntOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

export function toIntOrZero(v: unknown) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}
