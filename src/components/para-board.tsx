"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { BookmarkSimple, Compass, Target } from "@/components/icons";

import { useTodos } from "@/lib/app-data/use-todos";
import { useContexts } from "@/lib/app-data/use-contexts";
import { contextColor } from "@/lib/context-color";
import { useContainers } from "@/lib/app-data/use-containers";
import { cn } from "@/lib/utils";
import { CATEGORY_COLOR_VAR } from "@/lib/category";
import { PARA_KIND_LABELS, PARA_KINDS, type ParaKind } from "@/lib/types";
import { ContainerCard } from "@/components/para/container-card";
import { AddContainerForm } from "@/components/para/add-container-form";

const KIND_ICON: Record<ParaKind, typeof Target> = {
  project: Target,
  area: Compass,
  resource: BookmarkSimple,
};

export function ParaBoard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { todos } = useTodos();
  const { projects, addProject, areas, addArea, resources, addResource } = useContainers();
  const { contextOfContainer } = useContexts();
  const chipContextOf = (contextId: string | null) => {
    const context = contextOfContainer(contextId);
    return context && !context.isDefault ? context : null;
  };

  // 탭(Project/Area/Resource) 선택도 URL(`?kind=`)이 유일한 출처다 — 별도 state 없이 매 렌더마다
  // 계산한다. 그래야 상세 화면에 들어갔다 브라우저 뒤로가기를 눌러도 보고 있던 탭 그대로 돌아온다.
  const kindParam = searchParams.get("kind");
  const activeKind: ParaKind = kindParam === "area" || kindParam === "resource" ? kindParam : "project";

  function selectKind(kind: ParaKind) {
    router.replace(`/para?kind=${kind}`, { scroll: false });
  }

  function handleAddContainer(name: string) {
    if (activeKind === "project") void addProject(name);
    else if (activeKind === "area") void addArea(name);
    else void addResource(name);
  }

  // 완료 · 보관은 맨 뒤로, 그 안에서는 시작일 순(이른 것 먼저). Area/Resource는 시작일이 없으니 만든 날이
  // 시작일 — 같으면 만든 순
  type SortKey = { statusDone: boolean; startKey: string; createdAt: string };
  const byStart = (a: SortKey, b: SortKey) =>
    Number(a.statusDone) - Number(b.statusDone) ||
    a.startKey.localeCompare(b.startKey) ||
    a.createdAt.localeCompare(b.createdAt);

  const containerRows = (
    activeKind === "project"
      ? projects.map((p) => ({
          id: p.id,
          name: p.name,
          statusLabel: p.status === "active" ? "진행중" : "완료",
          statusDone: p.status === "completed",
          progress: (() => {
            const mappedTasks = todos.filter((t) => t.projectId === p.id && t.kind === "task");
            return mappedTasks.length
              ? Math.round((mappedTasks.filter((t) => t.completed).length / mappedTasks.length) * 100)
              : 0;
          })(),
          count: todos.filter((t) => t.projectId === p.id).length,
          contextId: p.contextId,
          period: { start: p.startDate, end: p.dueDate },
          startKey: p.startDate,
          createdAt: p.createdAt,
        }))
      : activeKind === "area"
        ? areas.map((a) => ({
            id: a.id,
            name: a.name,
            statusLabel: a.archived ? "보관" : "활성",
            statusDone: a.archived,
            progress: undefined,
            count: todos.filter((t) => t.areaId === a.id).length,
            contextId: a.contextId,
            period: undefined,
            startKey: a.createdAt.slice(0, 10),
            createdAt: a.createdAt,
          }))
        : resources.map((r) => ({
            id: r.id,
            name: r.name,
            statusLabel: r.archived ? "보관" : "활성",
            statusDone: r.archived,
            progress: undefined,
            count: todos.filter((t) => t.resourceId === r.id).length,
            contextId: r.contextId,
            period: undefined,
            startKey: r.createdAt.slice(0, 10),
            createdAt: r.createdAt,
          }))
  ).sort(byStart);

  return (
    <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-[22px] px-4 py-6 sm:px-9 sm:py-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <header className="flex flex-col gap-1">
          <h1 className="text-[28px] font-bold tracking-[-0.5px]">PARA</h1>
          <p className="text-[13.5px] text-muted-foreground">할 일을 프로젝트 · 영역 · 리소스 중 하나에 연결합니다</p>
        </header>

        <div role="group" aria-label="종류" className="flex rounded-lg bg-black/[0.06] p-0.5">
          {PARA_KINDS.map((kind) => {
            const Icon = KIND_ICON[kind];
            const selected = kind === activeKind;
            return (
              <button
                key={kind}
                type="button"
                onClick={() => selectKind(kind)}
                aria-pressed={selected}
                className={cn(
                  "flex h-[30px] items-center gap-1.5 rounded-md px-3.5 text-[13px] font-semibold transition-colors",
                  selected ? "bg-card shadow-[0_1px_3px_rgba(0,0,0,0.12)]" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="size-[14px]" style={selected ? { color: `var(${CATEGORY_COLOR_VAR[kind]})` } : undefined} />
                {PARA_KIND_LABELS[kind]}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
        {containerRows.map((row) => (
          <ContainerCard
            key={row.id}
            kind={activeKind}
            id={row.id}
            name={row.name}
            statusLabel={row.statusLabel}
            statusDone={row.statusDone}
            count={row.count}
            progress={row.progress}
            period={row.period}
            // 기본 컨텍스트는 칩을 달지 않는다(대부분이 기본이라) — 업무 · 건강처럼 기본이 아닌 것만
            contextName={chipContextOf(row.contextId)?.name}
            contextColor={(() => {
              const context = chipContextOf(row.contextId);
              return context ? contextColor(context.color) : undefined;
            })()}
            onClick={() => router.push(`/para/${activeKind}/${row.id}`)}
          />
        ))}
        <AddContainerForm
          placeholder={`새 ${PARA_KIND_LABELS[activeKind]} 만들기`}
          onAdd={handleAddContainer}
        />
      </div>
    </div>
  );
}
