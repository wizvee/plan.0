"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Bookmark, Compass, Target } from "lucide-react";

import { useSupabaseTodos } from "@/lib/supabase/todos";
import { useSupabaseAreas, useSupabaseProjects, useSupabaseResources } from "@/lib/supabase/containers";
import { preferSpecificTargetCollision } from "@/lib/dnd";
import { cn } from "@/lib/utils";
import { BACKLOG, PARA_KIND_LABELS, PARA_KINDS, type ParaKind, type Todo } from "@/lib/types";
import { TodoCard } from "@/components/todo-card";
import { TodoPanel } from "@/components/todo-panel";
import { AppNavRail } from "@/components/app-nav-rail";
import { ContainerCard } from "@/components/para/container-card";
import { AddContainerForm } from "@/components/para/add-container-form";

const KIND_ICON: Record<ParaKind, typeof Target> = {
  project: Target,
  area: Compass,
  resource: Bookmark,
};

function nextPosition(items: Todo[]) {
  return items.length === 0 ? 0 : Math.max(...items.map((t) => t.position)) + 1;
}

export function ParaBoard({ userId }: { userId: string }) {
  const router = useRouter();
  const { todos, setTodos, addTodo, updateTodo, removeTodo, persistPositions } = useSupabaseTodos(userId);
  const { projects, addProject } = useSupabaseProjects(userId);
  const { areas, addArea } = useSupabaseAreas(userId);
  const { resources, addResource } = useSupabaseResources(userId);

  const [activeKind, setActiveKind] = useState<ParaKind>("project");
  const [panelOpen, setPanelOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const backlogItems = useMemo(
    () => todos.filter((t) => t.day === null).sort((a, b) => a.position - b.position),
    [todos]
  );

  const nameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of projects) map.set(p.id, p.name);
    for (const a of areas) map.set(a.id, a.name);
    for (const r of resources) map.set(r.id, r.name);
    return map;
  }, [projects, areas, resources]);

  function badgeFor(todo: Todo): string | undefined {
    const mappedId = todo.projectId ?? todo.areaId ?? todo.resourceId;
    return mappedId ? nameById.get(mappedId) : undefined;
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;
    const activeIdStr = String(active.id);
    const overIdStr = String(over.id);
    const todo = todos.find((t) => t.id === activeIdStr);
    if (!todo) return;

    if (overIdStr.startsWith("para:")) {
      const [, kind, containerId] = overIdStr.split(":");
      const patch = {
        projectId: kind === "project" ? containerId : null,
        areaId: kind === "area" ? containerId : null,
        resourceId: kind === "resource" ? containerId : null,
      };
      setTodos((prev) => prev.map((t) => (t.id === activeIdStr ? { ...t, ...patch } : t)));
      void updateTodo(activeIdStr, patch);
      return;
    }

    const isOverBacklogItem = todos.some((t) => t.id === overIdStr && t.day === null);
    if (overIdStr !== BACKLOG && !isOverBacklogItem) return;

    if (todo.projectId || todo.areaId || todo.resourceId) {
      const patch = { projectId: null, areaId: null, resourceId: null };
      setTodos((prev) => prev.map((t) => (t.id === activeIdStr ? { ...t, ...patch } : t)));
      void updateTodo(activeIdStr, patch);
      return;
    }

    const oldIndex = backlogItems.findIndex((t) => t.id === activeIdStr);
    const overIndex = backlogItems.findIndex((t) => t.id === overIdStr);
    const ordered =
      oldIndex !== -1 && overIndex !== -1 && oldIndex !== overIndex
        ? arrayMove(backlogItems, oldIndex, overIndex)
        : backlogItems;

    const normalizedById = new Map(ordered.map((t, index) => [t.id, index]));
    setTodos((prev) =>
      prev.map((t) => (normalizedById.has(t.id) ? { ...t, position: normalizedById.get(t.id)! } : t))
    );
    void persistPositions(
      ordered.map((t) => ({ id: t.id, day: t.day, weekStart: t.weekStart, position: normalizedById.get(t.id)! }))
    );
  }

  function handleAddContainer(name: string) {
    if (activeKind === "project") void addProject(name);
    else if (activeKind === "area") void addArea(name);
    else void addResource(name);
  }

  const activeTodo = activeId ? todos.find((t) => t.id === activeId) ?? null : null;

  const containerRows =
    activeKind === "project"
      ? projects.map((p) => ({
          id: p.id,
          name: p.name,
          statusLabel: p.status === "active" ? "진행중" : "완료",
          statusDone: p.status === "completed",
          progress: (() => {
            const mapped = todos.filter((t) => t.projectId === p.id);
            return mapped.length ? Math.round((mapped.filter((t) => t.completed).length / mapped.length) * 100) : 0;
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
    <div className="min-h-screen pb-14 sm:pb-0 sm:pr-14">
      <div className="mx-auto flex w-full max-w-[1040px] flex-col gap-5 px-4 py-6 sm:px-6">
        <header className="flex flex-col gap-1">
          <h1 className="text-[26px] font-bold tracking-tight">PARA</h1>
          <p className="text-[14px] text-muted-foreground">할 일을 프로젝트·영역·리소스 중 하나에 매핑합니다</p>
        </header>

        <DndContext
          sensors={sensors}
          collisionDetection={preferSpecificTargetCollision}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex items-start gap-4">
            <nav className="flex shrink-0 flex-col gap-1.5 rounded-full border border-border bg-card p-1.5">
              {PARA_KINDS.map((kind) => {
                const Icon = KIND_ICON[kind];
                const selected = kind === activeKind;
                return (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => setActiveKind(kind)}
                    aria-pressed={selected}
                    aria-label={PARA_KIND_LABELS[kind]}
                    className={cn(
                      "flex size-11 flex-col items-center justify-center gap-0.5 rounded-full transition-colors",
                      selected ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-primary"
                    )}
                  >
                    <Icon className="size-[18px]" />
                    <span className="text-[8px] font-bold tracking-wide">{PARA_KIND_LABELS[kind]}</span>
                  </button>
                );
              })}
            </nav>

            <div className="min-w-0 flex-1">
              <p className="mb-2.5 text-[12px] font-bold uppercase tracking-wide text-muted-foreground">
                {PARA_KIND_LABELS[activeKind]}
              </p>
              <div className="flex flex-col gap-2.5">
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
          </div>

          {panelOpen ? (
            <SortableContext items={backlogItems.map((t) => t.id)} strategy={verticalListSortingStrategy}>
              <TodoPanel
                items={backlogItems}
                onToggle={(id) => {
                  const current = todos.find((t) => t.id === id);
                  if (current) void updateTodo(id, { completed: !current.completed });
                }}
                onRemove={(id) => void removeTodo(id)}
                onEdit={(id, content) => void updateTodo(id, { content })}
                onMemoEdit={(id, memo) => void updateTodo(id, { memo: memo || null })}
                onAdd={(content) => void addTodo(content, nextPosition(backlogItems))}
                onClose={() => setPanelOpen(false)}
                getBadge={badgeFor}
              />
            </SortableContext>
          ) : null}

          <DragOverlay>{activeTodo ? <TodoCard todo={activeTodo} overlay /> : null}</DragOverlay>
        </DndContext>
      </div>

      <AppNavRail activePage="para" panelOpen={panelOpen} onTogglePanel={() => setPanelOpen((open) => !open)} />
    </div>
  );
}
