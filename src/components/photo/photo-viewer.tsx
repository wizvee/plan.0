"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { ArrowSquareOut, CaretLeft, CaretRight, Star, Trash, X } from "@/components/icons";

import { driveFileUrl, photoUrl } from "@/lib/photos";
import type { TodoPhoto } from "@/lib/types";

/**
 * 사진 크게 보기 — 대표로 · Drive에서 열기 · 삭제, 여러 장이면 ‹ › (← → 키). (PHOTOS-PLAN.md)
 * 할 일 상세 모달 위에 body 포털로 띄운다. Esc는 이 뷰어만 닫는다(모달은 `defaultPrevented`를 보고 그대로 둔다).
 */
export function PhotoViewer({
  photos,
  index,
  isCover,
  onIndexChange,
  onSetCover,
  onRemove,
  onClose,
}: {
  photos: TodoPhoto[];
  index: number;
  isCover: boolean;
  onIndexChange: (index: number) => void;
  onSetCover: (id: string) => void;
  onRemove: (id: string) => void;
  onClose: () => void;
}) {
  const photo = photos[index];
  const count = photos.length;

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowLeft" && count > 1) {
        onIndexChange((index - 1 + count) % count);
      } else if (e.key === "ArrowRight" && count > 1) {
        onIndexChange((index + 1) % count);
      }
    }
    // capture — 모달의 Esc 처리(window, bubble)보다 먼저 받는다
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [index, count, onIndexChange, onClose]);

  if (!photo) return null;

  return createPortal(
    <div className="fixed inset-0 z-[70] flex flex-col bg-black/90 text-white" onClick={onClose}>
      <div className="flex h-14 shrink-0 items-center gap-1 px-3" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          className="flex size-9 items-center justify-center rounded-full hover:bg-white/15"
        >
          <X className="size-5" />
        </button>
        <span className="flex-1 text-center text-[13px] tabular-nums text-white/70">
          {count > 1 ? `${index + 1} / ${count}` : null}
        </span>
        {isCover ? (
          <span className="flex h-9 items-center gap-1.5 px-3 text-[13px] font-semibold text-white/80">
            <Star weight="fill" className="size-4" />
            대표 사진
          </span>
        ) : (
          <button
            type="button"
            onClick={() => onSetCover(photo.id)}
            className="flex h-9 items-center gap-1.5 rounded-lg px-3 text-[13px] font-semibold hover:bg-white/15"
          >
            <Star className="size-4" />
            대표로
          </button>
        )}
        <a
          href={driveFileUrl(photo.driveFileId)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-9 items-center gap-1.5 rounded-lg px-3 text-[13px] font-semibold hover:bg-white/15"
        >
          <ArrowSquareOut className="size-4" />
          Drive
        </a>
        <button
          type="button"
          onClick={() => onRemove(photo.id)}
          aria-label="사진 삭제 (Drive 휴지통으로)"
          title="Drive 휴지통으로 옮겨요 — 30일 안에 Drive에서 되살릴 수 있어요"
          className="flex size-9 items-center justify-center rounded-full text-destructive hover:bg-white/15"
        >
          <Trash className="size-[18px]" />
        </button>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center px-4 pb-6">
        {/* eslint-disable-next-line @next/next/no-img-element -- Drive에서 읽어오는 사용자 사진이라 next/image 최적화 대상이 아님 */}
        <img
          key={photo.id}
          src={photoUrl(photo.id, "full")}
          alt=""
          onClick={(e) => e.stopPropagation()}
          className="max-h-full max-w-full rounded-[4px] object-contain"
        />
        {count > 1 ? (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onIndexChange((index - 1 + count) % count);
              }}
              aria-label="이전 사진"
              className="absolute left-3 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 hover:bg-black/60"
            >
              <CaretLeft className="size-5" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onIndexChange((index + 1) % count);
              }}
              aria-label="다음 사진"
              className="absolute right-3 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 hover:bg-black/60"
            >
              <CaretRight className="size-5" />
            </button>
          </>
        ) : null}
      </div>
    </div>,
    document.body
  );
}
