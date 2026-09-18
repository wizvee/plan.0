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

import { createClient } from "@/lib/supabase/client";
import { useSupabaseTodos } from "@/lib/supabase/todos";
import { useSupabaseAreas, useSupabaseProjects, useSupabaseResources } from "@/lib/supabase/containers";
import { preferSpecificTargetCollision } from "@/lib/dnd";
import { cn } from "@/lib/utils";
import { BACKLOG, PARA_KIND_LABELS, PARA_KINDS, isInboxVisible, type ParaKind, type Todo, type TodoKind } from "@/lib/types";
import { TodoCard } from "@/components/todo-card";
import { AppSidebar } from "@/components/app-sidebar";
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

export function ParaBoard({ userId, userEmail }: { userId: string; userEmail: string }) {
  const router = useRouter();
  const { todos, setTodos, addTodo, addNote, updateTodo, removeTodo, persistPositions } = useSupabaseTodos(userId);
  const { projects, addProject } = useSupabaseProjects(userId);
  const { areas, addArea } = useSupabaseAreas(userId);
  const { resources, addResource } = useSupabaseResources(userId);

  const [activeKind, setActiveKind] = useState<ParaKind>("project");
  const [panelOpen, setPanelOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const backlogItems = useMemo(
    () => todos.filter(isInboxVisible).sort((a, b) => a.position - b.position),
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

    const isOverBacklogItem = todos.some((t) => t.id === overIdStr && isInboxVisible(t));
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
      ordered.map((t) => ({ id: t.id, position: normalizedById.get(t.id)! }))
    );
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  function handleAddContainer(name: string) {
    if (activeKind === "project") void addProject(name);
    else if (activeKind === "area") void addArea(name);
    else void addResource(name);
  }

  function handleAdd(content: string, kind: TodoKind) {
    if (kind === "note") void addNote(content, nextPosition(backlogItems));
    else void addTodo(content, nextPosition(backlogItems));
  }

  function handleConvert(id: string, kind: TodoKind) {
    if (kind === "note") {
      void updateTodo(id, {
        kind,
        scheduledDate: null,
        startMinutes: null,
        durationMinutes: null,
        completed: false,
      });
    } else {
      void updateTodo(id, { kind });
    }
  }

  function handleAssignPara(
    id: string,
    patch: { projectId: string | null; areaId: string | null; resourceId: string | null }
  ) {
    void updateTodo(id, patch);
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
    <div className="min-h-screen pb-14 sm:pb-0 sm:pl-[260px]">
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
                  onClick={() => setActiveKind(kind)}
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

        <DndContext
          sensors={sensors}
          collisionDetection={preferSpecificTargetCollision}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
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

          <SortableContext items={backlogItems.map((t) => t.id)} strategy={verticalListSortingStrategy}>
            <AppSidebar
              activePage="para"
              userEmail={userEmail}
              onSignOut={handleSignOut}
              panelOpen={panelOpen}
              onClosePanel={() => setPanelOpen(false)}
              items={backlogItems}
              projects={projects}
              areas={areas}
              resources={resources}
              onToggle={(id) => {
                const current = todos.find((t) => t.id === id);
                if (current) void updateTodo(id, { completed: !current.completed });
              }}
              onRemove={(id) => void removeTodo(id)}
              onEdit={(id, content) => void updateTodo(id, { content })}
              onMemoEdit={(id, memo) => void updateTodo(id, { memo: memo || null })}
              onUrlEdit={(id, url) => void updateTodo(id, { url })}
              onAssignPara={handleAssignPara}
              onConvert={handleConvert}
              onAdd={handleAdd}
              getBadge={badgeFor}
            />
          </SortableContext>

          <DragOverlay>{activeTodo ? <TodoCard todo={activeTodo} overlay /> : null}</DragOverlay>
        </DndContext>
      </div>

      <AppNavRail activePage="para" panelOpen={panelOpen} onTogglePanel={() => setPanelOpen((open) => !open)} />
    </div>
  );
}
