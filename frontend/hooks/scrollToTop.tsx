import { RefObject } from "react";

export const scrollToFormTop = (formRef: RefObject<HTMLDivElement | null>) => {
  if (formRef && formRef.current) {
    formRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
  } else {
    const el = document.scrollingElement || document.documentElement;
    el.scrollTo({ top: 0, behavior: "smooth" });
  }
};
