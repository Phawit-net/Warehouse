export function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}

export function parseJwt<T = any>(
  token?: string | null
): (T & { exp?: number }) | null {
  if (!token) return null;
  try {
    const payload = token.split(".")[1];
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function msUntilExp(token?: string | null) {
  const p = parseJwt(token);
  if (!p?.exp) return null;
  const ms = p.exp * 1000 - Date.now();
  return ms;
}
