"use client";

import { Check, LinkSimple, Plus } from "@/components/icons";

import { TodoCard } from "@/components/todo-card";
import { InlineText } from "@/components/inline-text";
import { cn } from "@/lib/utils";
import type { Area, Project, Resource, Todo, TodoKind } from "@/lib/types";

interface ScrapSectionProps {
  scraps: Todo[];
  projects: Project[];
  areas: Area[];
  resources: Resource[];
  selectMode: boolean;
  selectedIds: string[];
  promoting: boolean;
  onStartSelect: () => void;
  onCancelSelect: () => void;
  onToggleSelect: (id: string) => void;
  onPromote: () => void;
  onRemove: (id: string) => void;
  onEdit: (id: string, content: string) => void;
  onMemoEdit: (id: string, memo: string) => void;
  onUrlEdit: (id: string, url: string | null) => void;
  onAssignPara: (id: string, patch: { projectId: string | null; areaId: string | null; resourceId: string | null }) => void;
  onConvert: (id: string, kind: TodoKind) => void;
}

/** PLANNING.md 9.5: 스크랩(todos.kind='note') 섹션 — 여러 개를 골라 Drive 노트로 승격할 수 있다. */
export function ScrapSection({
  scraps,
  projects,
  areas,
  resources,
  selectMode,
  selectedIds,
  promoting,
  onStartSelect,
  onCancelSelect,
  onToggleSelect,
  onPromote,
  onRemove,
  onEdit,
  onMemoEdit,
  onUrlEdit,
  onAssignPara,
  onConvert,
}: ScrapSectionProps) {
  return (
    <section className="flex flex-col">
      <div className="flex items-center gap-1.5 px-1 pb-1.5">
        <h2 className="text-[13px] font-bold">스크랩</h2>
        <span className="text-[13px] text-muted-foreground">{scraps.length}</span>
        {selectMode ? (
          <button type="button" onClick={onCancelSelect} className="ml-auto h-[26px] rounded-md px-2 text-[13px] font-medium text-primary hover:bg-black/5">
            취소
          </button>
        ) : scraps.length > 0 ? (
          <button type="button" onClick={onStartSelect} className="ml-auto h-[26px] rounded-md px-2 text-[13px] font-medium text-primary hover:bg-black/5">
            노트로 만들기
          </button>
        ) : null}
      </div>

      {scraps.length === 0 ? (
        <p className="rounded-xl border border-border bg-card px-4 py-3 text-[13px] text-muted-foreground">아직 연결된 스크랩이 없어요.</p>
      ) : selectMode ? (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          {scraps.map((scrap, index) => {
            const checked = selectedIds.includes(scrap.id);
            return (
              <button
                key={scrap.id}
                type="button"
                onClick={() => onToggleSelect(scrap.id)}
                aria-pressed={checked}
                className={cn(
                  "flex min-h-[50px] w-full items-center gap-3 px-4 py-1.5 text-left hover:bg-black/[0.03]",
                  index < scraps.length - 1 && "border-b border-black/[0.06]"
                )}
              >
                <span
                  className={cn(
                    "flex size-[18px] shrink-0 items-center justify-center rounded-[5px] border-[1.5px] text-primary-foreground",
                    checked ? "border-primary bg-primary" : "border-input"
                  )}
                  aria-hidden="true"
                >
                  {checked ? <Check weight="bold" className="size-3" /> : null}
                </span>
                <LinkSimple className="size-[15px] shrink-0 text-muted-foreground" aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate text-[14px]">
                  <InlineText text={scrap.content} />
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          {scraps.map((scrap) => (
            <TodoCard
              key={scrap.id}
              todo={scrap}
              projects={projects}
              areas={areas}
              resources={resources}
              onRemove={onRemove}
              onEdit={onEdit}
              onMemoEdit={onMemoEdit}
              onUrlEdit={onUrlEdit}
              onAssignPara={onAssignPara}
              onConvert={onConvert}
            />
          ))}
        </div>
      )}

      {selectMode ? (
        <div className="mt-2.5 flex items-center gap-2.5 rounded-xl bg-accent py-2.5 pl-4 pr-2.5">
          <span className="flex-1 text-[13.5px] font-semibold text-accent-foreground">
            {selectedIds.length}개 선택됨 · 하나의 Drive 노트로 합치고 원본은 정리돼요
          </span>
          <button
            type="button"
            onClick={onPromote}
            disabled={selectedIds.length === 0 || promoting}
            className="flex h-[30px] items-center gap-1.5 rounded-[7px] bg-primary px-3.5 text-[13px] font-semibold text-primary-foreground disabled:opacity-50"
          >
            <Plus weight="bold" className="size-[14px]" />
            {promoting ? "만드는 중…" : "노트 만들기"}
          </button>
        </div>
      ) : null}
    </section>
  );
}
