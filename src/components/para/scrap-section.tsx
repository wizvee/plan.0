"use client";

import { Link2, Plus } from "lucide-react";

import { TodoCard } from "@/components/todo-card";
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
    <div className="mt-6 flex flex-col">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">스크랩</span>
        {selectMode ? (
          <button type="button" onClick={onCancelSelect} className="text-[12px] font-bold text-muted-foreground hover:text-foreground">
            취소
          </button>
        ) : scraps.length > 0 ? (
          <button type="button" onClick={onStartSelect} className="text-[12px] font-bold text-accent-foreground">
            노트로 만들기
          </button>
        ) : null}
      </div>

      {scraps.length === 0 ? (
        <p className="py-3 text-[13.5px] text-muted-foreground">아직 매핑된 스크랩이 없습니다.</p>
      ) : selectMode ? (
        <div className="flex flex-col divide-y divide-border/70">
          {scraps.map((scrap) => {
            const checked = selectedIds.includes(scrap.id);
            return (
              <button
                key={scrap.id}
                type="button"
                onClick={() => onToggleSelect(scrap.id)}
                className="flex items-center gap-2.5 rounded-md px-1 py-2.5 text-left hover:bg-accent/40"
              >
                <span
                  className={cn(
                    "flex size-4 shrink-0 items-center justify-center rounded-sm border",
                    checked ? "border-primary bg-primary" : "border-muted-foreground"
                  )}
                  aria-hidden="true"
                />
                <Link2 className="size-[15px] shrink-0 text-muted-foreground" aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate text-[14px]">{scrap.content}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-border/70">
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
        <div className="mt-3 flex items-center justify-between rounded-lg bg-accent px-3.5 py-2.5">
          <span className="text-[13px] font-bold text-accent-foreground">{selectedIds.length}개 선택됨</span>
          <button
            type="button"
            onClick={onPromote}
            disabled={selectedIds.length === 0 || promoting}
            className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-[13px] font-bold text-primary-foreground disabled:opacity-50"
          >
            <Plus className="size-[14px]" />
            {promoting ? "만드는 중…" : "노트 만들기"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
