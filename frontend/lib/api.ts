// lib/http.ts
import axios, {
  AxiosError,
  AxiosHeaders,
  AxiosInstance,
  InternalAxiosRequestConfig, // ใช้อันนี้ใน interceptor
} from "axios";

declare module "axios" {
  export interface AxiosRequestConfig {
    _skipAuth?: boolean; // กันไม่ให้ interceptor ใส่ header/ทำ retry (เช่นตอนเรียก /refresh)
    _retry?: boolean; // กันลูป
  }
}

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL!;

// ฟังก์ชันที่ AuthProvider จะ bind เข้ามา
let getAccessToken: () => string | null = () => null;
let setAccessToken: (t: string | null) => void = () => {};
let refreshOnce: () => Promise<string | null> = async () => null;

export function bindAuth(fns: {
  getAccessToken: () => string | null;
  setAccessToken: (t: string | null) => void;
  refresh: () => Promise<string | null>;
}) {
  getAccessToken = fns.getAccessToken;
  setAccessToken = fns.setAccessToken;
  refreshOnce = fns.refresh;
}

export const axiosInst: AxiosInstance = axios.create({
  baseURL: BASE,
  withCredentials: true, // ส่งคุกกี้ refresh
});

// --- Request: เติม Authorization อัตโนมัติ ---
axiosInst.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (config._skipAuth) return config;
  const token = getAccessToken(); // ฟังก์ชันของคุณเอง
  if (token) {
    // ให้ headers เป็น AxiosHeaders เสมอ
    if (!config.headers) config.headers = new AxiosHeaders();

    // ใช้ .set() จะ type-safe สุด
    (config.headers as AxiosHeaders).set("Authorization", `Bearer ${token}`);
  }
  return config;
});

// --- Response: จัดการ 401 + refresh (queue กันซ้อน) ---
let refreshingPromise: Promise<string | null> | null = null;

axiosInst.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const { config, response } = error;
    const original = config as InternalAxiosRequestConfig | undefined;

    // เงื่อนไขไม่ retry: ไม่มี config / โดน mark แล้ว / เป็น refresh เอง
    if (!original || original._retry || original._skipAuth) {
      return Promise.reject(error);
    }

    if (response && response.status === 401) {
      // ล็อกไม่ให้ refresh ซ้อน
      if (!refreshingPromise) {
        refreshingPromise = refreshOnce().finally(() => {
          // ปล่อยล็อกหลังเสร็จ
          setTimeout(() => (refreshingPromise = null), 0);
        });
      }
      const newToken = await refreshingPromise;
      if (!newToken) {
        return Promise.reject(error);
      }

      // retry เดิมด้วย token ใหม่
      (original as any)._retry = true;
      if (!original.headers) original.headers = new AxiosHeaders();
      (original.headers as AxiosHeaders).set(
        "Authorization",
        `Bearer ${newToken}`
      );

      return axiosInst.request(original);
    }

    return Promise.reject(error);
  }
);

// SWR fetcher
export const swrFetcher = (url: string) =>
  axiosInst.get(url).then((r) => r.data);
