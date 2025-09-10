import useSWR from "swr";
import { axiosInst } from "./api";

const fetcher = (url: string) => axiosInst.get(url).then((r) => r.data);

export function useMe() {
  const { data, error, isLoading, mutate } = useSWR("/api/auth/me", fetcher, {
    revalidateOnFocus: false,
  });
  return { me: data, loading: isLoading, error, mutate };
}
