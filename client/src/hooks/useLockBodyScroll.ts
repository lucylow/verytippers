// src/hooks/useLockBodyScroll.ts
import { useLayoutEffect } from "react";

export default function useLockBodyScroll(active: boolean) {
  useLayoutEffect(() => {
    const original = document.body.style.overflow;
    if (active) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = original;
    }
    return () => { document.body.style.overflow = original; };
  }, [active]);
}

