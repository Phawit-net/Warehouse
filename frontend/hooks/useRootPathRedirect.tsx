"use client";

import { usePathname, useRouter } from "next/navigation";

export const useRootPathRedirect = () => {
  const pathname = usePathname();
  const router = useRouter();

  const redirectToRoot = () => {
    const segments = pathname.split("/").filter(Boolean); // แยก path เช่น ['user', '1', '2']
    const rootPath = segments.length > 0 ? `/${segments[0]}` : "/";

    router.push(rootPath); // เช่น '/user'
  };

  return redirectToRoot;
};
