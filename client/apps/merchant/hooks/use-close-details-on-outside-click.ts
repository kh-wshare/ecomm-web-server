"use client";

import { useEffect, type RefObject } from "react";

export function useCloseDetailsOnOutsideClick(
  detailsRef: RefObject<HTMLDetailsElement | null>,
) {
  useEffect(() => {
    function closeIfOutside(event: PointerEvent) {
      const details = detailsRef.current;
      const target = event.target;

      if (!details?.open || !(target instanceof Node)) return;
      if (!details.contains(target)) details.open = false;
    }

    function closeOnEscape(event: KeyboardEvent) {
      const details = detailsRef.current;

      if (event.key === "Escape" && details?.open) {
        details.open = false;
      }
    }

    document.addEventListener("pointerdown", closeIfOutside);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("pointerdown", closeIfOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [detailsRef]);
}
