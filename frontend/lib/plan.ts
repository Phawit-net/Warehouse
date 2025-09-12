import useSWR, { mutate as swrMutate } from "swr";
import { axiosInst } from "./api";
import { useAuth } from "@/app/providers/AuthProvider";

export const PLAN_KEY = "/api/workspace/plan";
const fetcher = async () => (await axiosInst.get(PLAN_KEY)).data;

export function usePlan() {
  const { authReady, accessToken } = useAuth();
  return useSWR(PLAN_KEY, fetcher, {
    isPaused: () => !authReady || !accessToken, // ✅ รอจน auth พร้อมและมี access
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
    dedupingInterval: 120_000,
    keepPreviousData: true,
  });
}

export async function prefetchPlan(
  getAuth?: () => { authReady: boolean; access: string | null }
) {
  // ใช้ตอนต้องพรีโหลดแบบ manual
  const st = getAuth?.();
  if (st && (!st.authReady || !st.access)) return; // ยังไม่พร้อมก็ยังไม่พรีโหลด
  await swrMutate(PLAN_KEY, fetcher(), false);
}
