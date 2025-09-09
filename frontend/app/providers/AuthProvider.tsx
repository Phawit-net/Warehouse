"use client";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import { axiosInst, bindAuth } from "@/lib/api";
import { getCookie } from "@/lib/cookie";
import { mutate } from "swr";

const setHasSession = () => {
  if (typeof document === "undefined") return;
  document.cookie = "hasSession=1; Path=/; Max-Age=2592000; SameSite=Lax";
};
const clearHasSession = () => {
  if (typeof document === "undefined") return;
  document.cookie =
    "hasSession=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
};

// ---- types ----
type MeType = {
  user: { id: number; email: string };
  role: "OWNER" | "ADMIN" | "STAFF";
  current_workspace: { id: number };
  memberships: any[];
};
type AuthContextType = {
  accessToken: string | null;
  me: MeType | null;
  loading: boolean;
  login(email: string, password: string): Promise<void>;
  logout(): Promise<void>;
  refresh(): Promise<string | null>;
  // สำหรับโค้ดเก่าที่ใช้ fetchWithAuth ยังใช้ต่อได้ แต่ในแอปใหม่ให้ใช้ axiosInst แทน
  fetchWithAuth(
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response>;
  ready: boolean;
};

const AuthContext = createContext<AuthContextType>(null as any);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx)
    throw new Error(
      "useAuth must be used within <AuthProvider> (wrap app/layout.tsx)"
    );
  return ctx;
}

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // ==== state & ref ====
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [me, setMe] = useState<MeType | null>(null);
  const [ready, setReady] = useState(false);

  const [loading, setLoading] = useState(false);
  const accessRef = useRef<string | null>(null);
  const refreshingRef = useRef<Promise<string | null> | null>(null);

  useEffect(() => {
    accessRef.current = accessToken;
  }, [accessToken]);

  // setter เดียว ใช้ทั้ง state & ref
  const setAccess = (t: string | null) => {
    setAccessToken(t);
    accessRef.current = t;
  };

  // ==== refresh (คืน token | null) ====
  const refresh = useCallback(async (): Promise<string | null> => {
    if (refreshingRef.current) return refreshingRef.current; // กันซ้อน

    const csrf = getCookie("csrf_refresh_token");

    const job = (async () => {
      try {
        const res = await axiosInst.post(
          "/api/auth/refresh",
          {},
          { _skipAuth: true, headers: csrf ? { "X-CSRF-TOKEN": csrf } : {} }
        );
        const t = (res.data as any).access_token as string;
        setAccess(t);

        // ให้ navbar มี me หลัง F5
        if (!me) {
          try {
            const meRes = await axiosInst.get("/api/auth/me");
            setMe(meRes.data as MeType);
            mutate("/api/auth/me", meRes.data, false);
          } catch {}
        }
        return t;
      } catch {
        setAccess(null);
        setMe(null);
        return null;
      } finally {
        refreshingRef.current = null;
      }
    })();

    refreshingRef.current = job;
    return job;
  }, [me]);

  // ==== bind ให้ interceptors ใช้งาน ====
  useLayoutEffect(() => {
    bindAuth({
      getAccessToken: () => accessRef.current,
      setAccessToken: setAccess,
      refresh,
    });
    // setReady(true);
  }, [refresh]);

  // ==== login / logout ====
  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    try {
      const res = await axiosInst.post(
        "/api/auth/login",
        { email, password },
        { _skipAuth: true }
      );
      const t = (res.data as any).access_token as string;
      setAccess(t);
      setHasSession();

      // โหลด me (interceptor จะติด Authorization ให้เอง)
      const meRes = await axiosInst.get("/api/auth/me");
      setMe(meRes.data as MeType);
      mutate("/api/auth/me", meRes.data, false);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    const csrf = getCookie("csrf_refresh_token");
    try {
      await axiosInst.post(
        "/api/auth/logout",
        {},
        {
          _skipAuth: true,
          headers: csrf ? { "X-CSRF-TOKEN": csrf } : {},
        }
      );
    } finally {
      clearHasSession();
      setAccess(null);
      setMe(null);
    }
  }, []);

  // ==== boot: หน้าแรก (ไม่ใช่ /login) ถ้ามี csrf ให้ลอง refresh เงียบ ๆ 1 ครั้ง ====
  useEffect(() => {
    (async () => {
      const hasCsrf = !!getCookie("csrf_refresh_token");
      if (hasCsrf && !accessRef.current) {
        await refresh(); // ดึง access token ใส่ memory
      } else if (!hasCsrf) {
        clearHasSession();
      }
      setReady(true); // ให้ SWR/หน้าอื่นเริ่มยิงได้
    })();
  }, [refresh]);

  // ==== fetchWithAuth (compat โค้ดเก่า) → ควรย้ายไปใช้ axiosInst แทน ====
  const fetchWithAuth = useCallback(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      // แปลงให้วิ่งผ่าน axiosInst เพื่อ reuse interceptors
      const url = typeof input === "string" ? input : (input as URL).toString();
      const method = (init?.method || "GET").toUpperCase();
      const data = init?.body ? JSON.parse(init.body as string) : undefined;
      const headers = init?.headers as Record<string, string> | undefined;

      const res = await axiosInst.request({
        url,
        method,
        data,
        headers,
      });
      // สร้าง Response-like object (minimal) เผื่อโค้ดเก่ายัง await .json()
      return new Response(JSON.stringify(res.data), {
        status: res.status,
        headers: new Headers(Object.entries(res.headers) as any),
      });
    },
    []
  );

  return (
    <AuthContext.Provider
      value={{
        accessToken,
        me,
        loading,
        login,
        logout,
        refresh,
        fetchWithAuth, // แนะนำค่อย ๆ ย้ายไปใช้ axiosInst/swrFetcher
        ready,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
