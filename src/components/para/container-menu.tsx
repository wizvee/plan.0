"use client";

import { useRef, useState, type ReactNode } from "react";
import { Archive, ArrowCounterClockwise, BoxArrowUp, CheckCircle, DotsThree, PencilSimple, Trash } from "@/components/icons";

import { cn } from "@/lib/utils";
import { useDismiss } from "@/lib/use-dismiss";
import { PARA_KIND_LABELS_KO, type ParaKind } from "@/lib/types";

/**
 * PARA 상세 이름 옆 `···` 메뉴 — 이름 바꾸기 · 상태 전환 · 삭제 (PARA-MANAGE-PLAN.md 2-2).
 * 삭제는 여기에만 있다(목록 카드에는 넣지 않음). macOS 메뉴 스타일은 `RetroKindSelect`와 같다.
 */
export function ContainerMenu({
  kind,
  statusDone,
  onRename,
  onToggleStatus,
  onDelete,
}: {
  kind: ParaKind;
  /** Project는 완료, Area/Resource는 보관 상태인지 */
  statusDone: boolean;
  onRename: () => void;
  onToggleStatus: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useDismiss(open, ref, () => setOpen(false));

  const statusItem =
    kind === "project"
      ? statusDone
        ? { icon: ArrowCounterClockwise, label: "진행중으로 되돌리기" }
        : { icon: CheckCircle, label: "완료로 표시" }
      : statusDone
        ? { icon: BoxArrowUp, label: "보관 해제" }
        : { icon: Archive, label: "보관하기" };

  function pick(action: () => void) {
    setOpen(false);
    action();
  }

  return (
    <div ref={ref} className="relative ml-auto shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="더보기"
        className={cn(
          "flex size-8 items-center justify-center rounded-full bg-black/[0.05] hover:bg-black/[0.09]",
          open && "bg-black/[0.12]"
        )}
      >
        <DotsThree className="size-[18px]" />
      </button>
      {open ? (
        <div
          role="menu"
          aria-label={`${PARA_KIND_LABELS_KO[kind]} 메뉴`}
          className="absolute right-0 top-[calc(100%+6px)] z-30 w-[220px] rounded-[10px] border border-black/10 bg-popover/95 p-[5px] shadow-[0_12px_32px_rgba(0,0,0,0.16),0_2px_6px_rgba(0,0,0,0.06)] backdrop-blur"
        >
          <MenuItem icon={<PencilSimple className="size-[15px]" />} onClick={() => pick(onRename)}>
            이름 바꾸기
          </MenuItem>
          <MenuItem icon={<statusItem.icon className="size-[15px]" />} onClick={() => pick(onToggleStatus)}>
            {statusItem.label}
          </MenuItem>
          <div className="mx-2 my-[5px] h-px bg-black/10" role="separator" />
          <MenuItem icon={<Trash className="size-[15px]" />} onClick={() => pick(onDelete)} destructive>
            {PARA_KIND_LABELS_KO[kind]} 삭제…
          </MenuItem>
        </div>
      ) : null}
    </div>
  );
}

function MenuItem({
  icon,
  destructive,
  onClick,
  children,
}: {
  icon: ReactNode;
  destructive?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={cn(
        "flex h-8 w-full items-center gap-2.5 rounded-md px-2.5 text-left text-[13.5px] hover:bg-primary hover:text-primary-foreground",
        destructive && "text-destructive"
      )}
    >
      {icon}
      {children}
    </button>
  );
}
