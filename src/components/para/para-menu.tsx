"use client";

import { useState } from "react";
import { Check, Prohibit } from "@/components/icons";

import { cn } from "@/lib/utils";
import { CATEGORY_COLOR_VAR } from "@/lib/category";
import type { Area, ParaKind, Project, Resource } from "@/lib/types";

const KIND_LABEL: Record<ParaKind, string> = {
  project: "프로젝트",
  area: "영역",
  resource: "리소스",
};

/**
 * PARA 하나 고르기 드롭다운 — 검색 + 없음(해제) + 종류별 목록. 할 일 상세 팝업과 주간 목표 카드가 같이 쓴다.
 * 여닫기 · 트리거 버튼 · 바깥 클릭은 쓰는 쪽이 맡는다. 위치는 `className`으로.
 */
export function ParaMenu({
  projects,
  areas,
  resources,
  selected,
  onPick,
  onClear,
  className,
}: {
  projects: Project[];
  areas: Area[];
  resources: Resource[];
  selected: { kind: ParaKind; id: string } | null;
  onPick: (kind: ParaKind, id: string) => void;
  onClear: () => void;
  className?: string;
}) {
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const filterItems = <T extends { name: string }>(list: T[]) =>
    q ? list.filter((i) => i.name.toLowerCase().includes(q)) : list;
  const groups = [
    { kind: "project" as const, items: filterItems(projects) },
    { kind: "area" as const, items: filterItems(areas) },
    { kind: "resource" as const, items: filterItems(resources) },
  ];
  const noMatches = groups.every((g) => g.items.length === 0);

  return (
    <div
      className={cn(
        "z-20 max-h-64 overflow-y-auto rounded-lg border border-border bg-card p-1.5 shadow-lg",
        className
      )}
    >
      <div className="p-1">
        <input
          autoFocus
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="검색"
          className="w-full border-0 border-b border-border bg-transparent px-1 py-1.5 text-[13px] outline-none placeholder:text-muted-foreground"
        />
      </div>

      <button
        type="button"
        onClick={onClear}
        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] text-muted-foreground hover:bg-accent"
      >
        <Prohibit weight="bold" className="size-3.5" />
        <span className="flex-1">없음</span>
      </button>

      <div className="my-1 border-t border-border" />

      {groups.map(({ kind, items }) =>
        items.length > 0 ? (
          <div key={kind}>
            <div className="px-2 pb-1 pt-2 text-[11px] font-bold text-muted-foreground">{KIND_LABEL[kind]}</div>
            {items.map((item) => {
              const dotColor = `var(${CATEGORY_COLOR_VAR[kind]})`;
              const isSelected = selected?.kind === kind && selected.id === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onPick(kind, item.id)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] hover:bg-accent"
                >
                  <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: dotColor }} />
                  <span className="min-w-0 flex-1 truncate">{item.name}</span>
                  {isSelected ? <Check weight="bold" className="size-3.5 shrink-0" style={{ color: dotColor }} /> : null}
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
  );
}
