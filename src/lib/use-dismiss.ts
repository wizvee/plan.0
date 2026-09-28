"use client";

import { useEffect, type RefObject } from "react";

/**
 * 팝오버 바깥을 누르거나 Esc를 누르면 닫는다. `ref` 안(트리거 버튼 포함)을 누른 건 무시한다.
 * Esc는 `preventDefault()`로 "처리됨" 표시를 한다 — 모달 안의 팝오버에서 Esc를 누르면 팝오버만 닫히고
 * 모달은 그대로 있게(모달의 Esc 핸들러가 `defaultPrevented`를 확인한다).
 */
export function useDismiss(open: boolean, ref: RefObject<HTMLElement | null>, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!ref.current?.contains(e.target as Node)) onClose();
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, ref, onClose]);
}
