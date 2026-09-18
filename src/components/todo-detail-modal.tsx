"use client";

import { useEffect, useRef, useState } from "react";
import { Bookmark, Check, ChevronDown, CircleOff, Compass, ExternalLink, Layers, Link2, StickyNote, Target, Trash2, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { CATEGORY_COLOR_VAR, CATEGORY_TINT_VAR, getParaCategory } from "@/lib/category";
import type { Area, ParaKind, Project, Resource, Todo, TodoKind } from "@/lib/types";

const KIND_ICON: Record<ParaKind, typeof Target> = {
  project: Target,
  area: Compass,
  resource: Bookmark,
};

const KIND_LABEL: Record<ParaKind, string> = {
  project: "프로젝트",
  area: "영역",
  resource: "리소스",
};

interface ParaAssignPatch {
  projectId: string | null;
  areaId: string | null;
  resourceId: string | null;
}

interface TodoDetailModalProps {
  todo: Todo;
  projects: Project[];
  areas: Area[];
  resources: Resource[];
  onEdit: (id: string, content: string) => void;
  onMemoEdit: (id: string, memo: string) => void;
  onUrlEdit: (id: string, url: string | null) => void;
  onAssignPara: (id: string, patch: ParaAssignPatch) => void;
  onRemove: (id: string) => void;
  onConvert?: (id: string, kind: TodoKind) => void;
  onClose: () => void;
}

export function TodoDetailModal({
  todo,
  projects,
  areas,
  resources,
  onEdit,
  onMemoEdit,
  onUrlEdit,
  onAssignPara,
  onRemove,
  onConvert,
  onClose,
}: TodoDetailModalProps) {
  const [title, setTitle] = useState(todo.content);
  const [memo, setMemo] = useState(todo.memo ?? "");
  const [url, setUrl] = useState(todo.url ?? "");
  const [paraOpen, setParaOpen] = useState(false);
  const [paraQuery, setParaQuery] = useState("");
  const paraRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (!paraOpen) return;
    function onPointerDown(e: PointerEvent) {
      if (paraRef.current && !paraRef.current.contains(e.target as Node)) {
        setParaOpen(false);
        setParaQuery("");
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [paraOpen]);

  function commitTitle() {
    const trimmed = title.trim();
    if (trimmed && trimmed !== todo.content) {
      onEdit(todo.id, trimmed);
    } else {
      setTitle(todo.content);
    }
  }

  function commitMemo() {
    const trimmed = memo.trim();
    if (trimmed !== (todo.memo ?? "")) {
      onMemoEdit(todo.id, trimmed);
    }
  }

  function commitUrl() {
    const trimmed = url.trim();
    if (trimmed !== (todo.url ?? "")) {
      onUrlEdit(todo.id, trimmed || null);
    }
  }

  function pick(kind: ParaKind, id: string) {
    onAssignPara(todo.id, {
      projectId: kind === "project" ? id : null,
      areaId: kind === "area" ? id : null,
      resourceId: kind === "resource" ? id : null,
    });
    setParaOpen(false);
    setParaQuery("");
  }

  function clearPara() {
    onAssignPara(todo.id, { projectId: null, areaId: null, resourceId: null });
    setParaOpen(false);
    setParaQuery("");
  }

  const category = getParaCategory(todo);
  const mappedId = todo.projectId ?? todo.areaId ?? todo.resourceId;
  const mappedName = category
    ? (category === "project" ? projects : category === "area" ? areas : resources).find((c) => c.id === mappedId)
        ?.name ?? null
    : null;

  const color = category ? `var(${CATEGORY_COLOR_VAR[category]})` : "var(--muted-foreground)";
  const tint = category ? `var(${CATEGORY_TINT_VAR[category]})` : "var(--secondary)";
  const KindIcon = category ? KIND_ICON[category] : Layers;

  const q = paraQuery.trim().toLowerCase();
  const filterItems = <T extends { name: string }>(list: T[]) =>
    q ? list.filter((i) => i.name.toLowerCase().includes(q)) : list;
  const projectMatches = filterItems(projects);
  const areaMatches = filterItems(areas);
  const resourceMatches = filterItems(resources);
  const noMatches = projectMatches.length === 0 && areaMatches.length === 0 && resourceMatches.length === 0;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div
        className="flex w-full max-w-sm flex-col rounded-xl bg-card p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <Input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
            }}
            className="h-auto min-w-0 flex-1 border-0 bg-transparent p-0 text-[19px] font-bold shadow-none focus-visible:ring-0"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-accent"
          >
            <X className="size-4" />
          </button>
        </div>

        <div ref={paraRef} className="relative mt-2.5">
          <button
            type="button"
            onClick={() => setParaOpen((open) => !open)}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-md p-2 text-left hover:bg-accent",
              paraOpen && "bg-accent"
            )}
          >
            <span
              className="flex size-7 shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: tint, color }}
            >
              <KindIcon className="size-4" />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-px">
              <span className="text-[11px] font-semibold text-muted-foreground">
                {category ? KIND_LABEL[category] : "PARA"}
              </span>
              <span
                className="truncate text-[14px] font-semibold"
                style={{ color: mappedName ? undefined : "var(--muted-foreground)" }}
              >
                {mappedName ?? "선택 안 함"}
              </span>
            </span>
            <ChevronDown
              className={cn("size-[15px] shrink-0 text-muted-foreground transition-transform", paraOpen && "rotate-180")}
            />
          </button>

          {paraOpen ? (
            <div className="absolute inset-x-0 top-[calc(100%+4px)] z-20 max-h-64 overflow-y-auto rounded-lg border border-border bg-card p-1.5 shadow-lg">
              <div className="p-1">
                <input
                  autoFocus
                  type="text"
                  value={paraQuery}
                  onChange={(e) => setParaQuery(e.target.value)}
                  placeholder="검색"
                  className="w-full border-0 border-b border-border bg-transparent px-1 py-1.5 text-[13px] outline-none placeholder:text-muted-foreground"
                />
              </div>

              <button
                type="button"
                onClick={clearPara}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] text-muted-foreground hover:bg-accent"
              >
                <CircleOff className="size-3.5" />
                <span className="flex-1">없음</span>
              </button>

              <div className="my-1 border-t border-border" />

              {[
                { kind: "project" as const, items: projectMatches, color: `var(${CATEGORY_COLOR_VAR.project})` },
                { kind: "area" as const, items: areaMatches, color: `var(${CATEGORY_COLOR_VAR.area})` },
                { kind: "resource" as const, items: resourceMatches, color: `var(${CATEGORY_COLOR_VAR.resource})` },
              ].map(({ kind, items, color: dotColor }) =>
                items.length > 0 ? (
                  <div key={kind}>
                    <div className="px-2 pb-1 pt-2 text-[11px] font-bold text-muted-foreground">{KIND_LABEL[kind]}</div>
                    {items.map((item) => {
                      const selected = mappedId === item.id && category === kind;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => pick(kind, item.id)}
                          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] hover:bg-accent"
                        >
                          <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: dotColor }} />
                          <span className="min-w-0 flex-1 truncate">{item.name}</span>
                          {selected ? <Check className="size-3.5 shrink-0" style={{ color: dotColor }} /> : null}
                        </button>
                      );
                    })}
                  </div>
                ) : null
              )}

              {noMatches ? (
                <div className="px-2 py-3.5 text-center text-[12.5px] text-muted-foreground">검색 결과가 없어요</div>
              ) : null}
            </div>
          ) : null}
        </div>

        <textarea
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          onBlur={commitMemo}
          placeholder="메모"
          rows={3}
          className="mt-2.5 resize-y border-0 bg-transparent p-0 text-[15px] leading-snug text-foreground outline-none placeholder:text-muted-foreground"
        />

        <div className="my-3 border-t border-border" />
        <div className="flex items-center gap-1.5 rounded-md bg-muted pl-2.5 pr-1">
          <Link2 className="size-4 shrink-0 text-muted-foreground" />
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onBlur={commitUrl}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
            }}
            placeholder="URL 추가"
            className="min-w-0 flex-1 border-0 bg-transparent py-2 text-[13px] outline-none placeholder:text-muted-foreground"
          />
          {url.trim() ? (
            <a
              href={url.trim()}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              aria-label="새 탭에서 열기"
              className="flex size-[26px] shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-card"
            >
              <ExternalLink className="size-3.5" />
            </a>
          ) : null}
        </div>

        <div className="mt-3.5 flex items-center justify-between border-t border-border pt-2.5">
          {onConvert ? (
            <button
              type="button"
              onClick={() => onConvert(todo.id, todo.kind === "note" ? "task" : "note")}
              className="-ml-2 flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[13px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <StickyNote className="size-3.5" />
              {todo.kind === "note" ? "할 일로 전환" : "노트로 전환"}
            </button>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={() => {
              onRemove(todo.id);
              onClose();
            }}
            aria-label="삭제"
            className="-mr-1.5 flex size-8 items-center justify-center rounded-md text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="size-[17px]" />
          </button>
        </div>
      </div>
    </div>
  );
}
