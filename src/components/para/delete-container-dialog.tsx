"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Cloud, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { useSession } from "@/lib/app-data/app-data-provider";
import { useContainerActions, type RemoveContainerResult } from "@/lib/app-data/container-actions";
import { InlineText } from "@/components/inline-text";
import { PARA_KIND_LABELS_KO, type ParaKind } from "@/lib/types";

const OBJECT_LABEL: Record<ParaKind, string> = { project: "프로젝트를", area: "영역을", resource: "리소스를" };

type Mode = "wipe" | "keep";

/**
 * PARA 컨테이너 삭제 확인 (PARA-MANAGE-PLAN.md 2-2). 기본은 "함께 삭제" — 매핑된 할 일 · 노트를 지우고 Drive 폴더는
 * Drive 휴지통으로. "연결만 끊기"는 할 일 · 노트 · Drive 폴더를 남긴다. body 포털(DESIGN.md 6번 "모달").
 */
export function DeleteContainerDialog({
  kind,
  id,
  name,
  taskCount,
  noteCount,
  projectRetroCount,
  hasDriveFolder,
  markDoneLabel,
  onMarkDone,
  onBusyChange,
  onDeleted,
  onClose,
}: {
  kind: ParaKind;
  id: string;
  name: string;
  taskCount: number;
  noteCount: number;
  /** 프로젝트에 직접 붙은 회고 수 (Area/Resource는 0) */
  projectRetroCount: number;
  hasDriveFolder: boolean;
  /** "대신 완료로 표시" · "대신 보관하기" — 이미 완료/보관이면 null(안내를 숨김) */
  markDoneLabel: string | null;
  onMarkDone: () => void;
  onBusyChange: (busy: boolean) => void;
  onDeleted: () => void;
  onClose: () => void;
}) {
  const { googleConnected } = useSession();
  const { removeContainer } = useContainerActions();
  const [mode, setMode] = useState<Mode>("wipe");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Extract<RemoveContainerResult, { ok: false }> | null>(null);

  const kindLabel = PARA_KIND_LABELS_KO[kind];
  const hasItems = taskCount + noteCount > 0;
  // 연결된 게 없으면 선택지가 의미 없다 — Drive 폴더만 휴지통으로 보내는 "함께 삭제"로 처리
  const withItems = !hasItems || mode === "wipe";

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [busy, onClose]);

  async function confirm(skipDrive = false) {
    setBusy(true);
    onBusyChange(true);
    setError(null);
    const result = await removeContainer(kind, id, { withItems, skipDrive });
    if (result.ok) {
      onDeleted();
      return;
    }
    setBusy(false);
    onBusyChange(false);
    setError(result);
  }

  const itemSummary = [taskCount > 0 ? `할 일 ${taskCount}개` : null, noteCount > 0 ? `스크랩 ${noteCount}개` : null]
    .filter(Boolean)
    .join(" · ");

  let driveLine: string | null = null;
  if (hasDriveFolder) {
    if (!withItems) driveLine = `Google Drive 폴더 ‘${name}’은 Drive에 그대로 남아요`;
    else if (googleConnected) driveLine = `Google Drive 폴더 ‘${name}’은 휴지통으로 옮겨져요 · 30일 안에 Drive에서 복구할 수 있어요`;
    else driveLine = `Google Drive가 연결돼 있지 않아 폴더 ‘${name}’은 Drive에 그대로 남아요`;
  }

  const confirmLabel = busy ? "삭제 중…" : !hasItems ? "삭제" : mode === "wipe" ? "모두 삭제" : `${kindLabel}만 삭제`;

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 p-4"
      onClick={() => {
        if (!busy) onClose();
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-container-title"
        className="flex max-h-[calc(100dvh-2rem)] w-full max-w-[440px] flex-col overflow-y-auto rounded-xl bg-card px-5 pb-4 pt-[22px] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="flex size-11 items-center justify-center rounded-full bg-destructive/[0.12] text-destructive">
          <Trash2 className="size-[22px]" strokeWidth={1.8} aria-hidden="true" />
        </span>
        <h2 id="delete-container-title" className="mb-1 mt-3.5 text-[19px] font-bold tracking-[-0.3px]">
          ‘<InlineText text={name} />’ {OBJECT_LABEL[kind]} 삭제할까요?
        </h2>
        <p className="text-[13.5px] leading-normal text-muted-foreground">앱에서 지운 항목은 되돌릴 수 없어요.</p>

        {hasItems ? (
          <fieldset className="mt-[18px]" disabled={busy}>
            <legend className="pb-2 text-[13px] font-bold">연결된 {itemSummary}는</legend>
            <div className="overflow-hidden rounded-[10px] border border-black/10">
              <ModeOption
                checked={mode === "wipe"}
                onSelect={() => setMode("wipe")}
                title="함께 삭제"
                badge="기본"
                description={
                  hasDriveFolder && googleConnected
                    ? `${itemSummary}를 지우고(하위 할 일 · 회고 포함), Drive 폴더는 휴지통으로 옮겨요`
                    : `${itemSummary}를 모두 지워요(하위 할 일 · 회고 포함)`
                }
              />
              <ModeOption
                checked={mode === "keep"}
                onSelect={() => setMode("keep")}
                title="연결만 끊기"
                description={[
                  taskCount > 0 ? "할 일은 캘린더와 Inbox에 그대로 남아요" : null,
                  noteCount > 0 ? "스크랩은 Inbox로 돌아가요" : null,
                  hasDriveFolder ? "Drive 폴더도 그대로 둬요" : null,
                ]
                  .filter(Boolean)
                  .join(". ")}
                bordered
              />
            </div>
          </fieldset>
        ) : null}

        {projectRetroCount > 0 || driveLine ? (
          <ul className="mt-3.5 flex flex-col gap-1.5 text-[12.5px] text-muted-foreground">
            {projectRetroCount > 0 ? (
              <li className="flex items-center gap-[7px]">
                <Trash2 className="size-3.5 shrink-0" strokeWidth={1.8} aria-hidden="true" />
                프로젝트 회고 {projectRetroCount}개는 함께 삭제돼요
              </li>
            ) : null}
            {driveLine ? (
              <li className="flex items-center gap-[7px]">
                <Cloud className="size-3.5 shrink-0" strokeWidth={1.8} aria-hidden="true" />
                {driveLine}
              </li>
            ) : null}
          </ul>
        ) : null}

        {markDoneLabel ? (
          <div className="mt-3.5 flex items-center gap-2 rounded-lg bg-secondary px-3 py-2.5 text-[12.5px] text-muted-foreground">
            <span className="flex-1">지우지 않고 목록에서 치워두고 싶다면</span>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                onMarkDone();
                onClose();
              }}
              className="font-semibold text-primary disabled:opacity-60"
            >
              {markDoneLabel}
            </button>
          </div>
        ) : null}

        {error ? (
          <div role="alert" className="mt-3.5 rounded-lg bg-destructive/[0.08] px-3 py-2.5 text-[12.5px]">
            <p className="font-semibold text-destructive">{error.message}</p>
            {error.step === "drive" ? (
              <p className="mt-0.5 text-muted-foreground">아직 아무것도 지우지 않았어요.</p>
            ) : null}
          </div>
        ) : null}

        <div className="mt-[18px] flex flex-wrap items-center justify-end gap-2">
          {error?.step === "drive" ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void confirm(true)}
              className="mr-auto text-[13px] font-semibold text-primary disabled:opacity-60"
            >
              Drive 폴더는 두고 삭제
            </button>
          ) : null}
          <button
            type="button"
            autoFocus
            disabled={busy}
            onClick={onClose}
            className="h-[34px] rounded-lg bg-black/[0.06] px-4 text-[13.5px] font-semibold hover:bg-black/[0.09] disabled:opacity-60"
          >
            취소
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void confirm()}
            className="h-[34px] rounded-lg bg-destructive px-4 text-[13.5px] font-semibold text-white hover:bg-destructive/90 disabled:opacity-60"
          >
            {error?.step === "drive" && !busy ? "다시 시도" : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function ModeOption({
  checked,
  onSelect,
  title,
  badge,
  description,
  bordered,
}: {
  checked: boolean;
  onSelect: () => void;
  title: string;
  badge?: string;
  description: string;
  bordered?: boolean;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-2.5 px-3.5 py-3",
        bordered && "border-t border-black/[0.08]",
        checked && "bg-primary/[0.05]"
      )}
    >
      <input
        type="radio"
        name="delete-container-mode"
        checked={checked}
        onChange={onSelect}
        className="mt-0.5 size-[17px] shrink-0 accent-primary"
      />
      <span className="flex flex-col gap-0.5">
        <span className="flex items-center gap-1.5 text-[14px] font-semibold">
          {title}
          {badge ? (
            <span className="rounded-[5px] bg-accent px-1.5 py-px text-[11px] font-semibold text-accent-foreground">{badge}</span>
          ) : null}
        </span>
        <span className="text-[12.5px] leading-[1.45] text-muted-foreground">{description}</span>
      </span>
    </label>
  );
}
