"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Bookmark, Compass, Target } from "lucide-react";

import { useTodos } from "@/lib/app-data/use-todos";
import { useContainers } from "@/lib/app-data/use-containers";
import { cn } from "@/lib/utils";
import { PARA_KIND_LABELS, PARA_KINDS, type ParaKind } from "@/lib/types";
import { ContainerCard } from "@/components/para/container-card";
import { AddContainerForm } from "@/components/para/add-container-form";

const KIND_ICON: Record<ParaKind, typeof Target> = {
  project: Target,
  area: Compass,
  resource: Bookmark,
};

export function ParaBoard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { todos } = useTodos();
  const { projects, addProject, areas, addArea, resources, addResource } = useContainers();

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

  const containerRows =
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
        }))
      : activeKind === "area"
        ? areas.map((a) => ({
            id: a.id,
            name: a.name,
            statusLabel: a.archived ? "보관" : "활성",
            statusDone: a.archived,
            progress: undefined,
            count: todos.filter((t) => t.areaId === a.id).length,
          }))
        : resources.map((r) => ({
            id: r.id,
            name: r.name,
            statusLabel: r.archived ? "보관" : "활성",
            statusDone: r.archived,
            progress: undefined,
            count: todos.filter((t) => t.resourceId === r.id).length,
          }));

  return (
    <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-5 px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <header className="flex flex-col gap-1">
          <h1 className="text-[26px] font-bold tracking-tight">PARA</h1>
          <p className="text-[14px] text-muted-foreground">할 일을 프로젝트·영역·리소스 중 하나에 매핑합니다</p>
        </header>

        <div className="flex gap-0.5 rounded-md bg-border/60 p-0.5">
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
                  "flex items-center gap-1.5 rounded-sm px-3.5 py-1.5 text-[13px] font-semibold transition-colors",
                  selected ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="size-[14px]" />
                {PARA_KIND_LABELS[kind]}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
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
