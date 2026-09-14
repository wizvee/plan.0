"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format, differenceInCalendarDays } from "date-fns";
import { ArrowLeft, Bookmark, Compass, Target } from "lucide-react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, verticalListSortingStrategy } from "@dnd-kit/sortable";

import { useSupabaseTodos } from "@/lib/supabase/todos";
import { useSupabaseAreas, useSupabaseProjects, useSupabaseResources } from "@/lib/supabase/containers";
import { preferSpecificTargetCollision } from "@/lib/dnd";
import { cn } from "@/lib/utils";
import {
  BACKLOG,
  PARA_KIND_LABELS,
  isInboxVisible,
  type ParaContainer,
  type ParaKind,
  type Todo,
  type TodoKind,
} from "@/lib/types";
import { TodoCard } from "@/components/todo-card";
import { TodoPanel } from "@/components/todo-panel";
import { AppNavRail } from "@/components/app-nav-rail";
import { AddContainerForm } from "@/components/para/add-container-form";

const KIND_ICON: Record<ParaKind, typeof Target> = {
  project: Target,
  area: Compass,
  resource: Bookmark,
};

function daysLeftLabel(dueDate: string): string {
  const diff = differenceInCalendarDays(new Date(dueDate), new Date());
  if (diff === 0) return "오늘 마감";
  if (diff > 0) return `D-${diff}`;
  return `D+${Math.abs(diff)}`;
}

function nextPosition(items: Todo[]) {
  return items.length === 0 ? 0 : Math.max(...items.map((t) => t.position)) + 1;
}

interface ContainerDetailScreenProps {
  kind: ParaKind;
  id: string;
  userId: string;
}

export function ContainerDetailScreen({ kind, id, userId }: ContainerDetailScreenProps) {
  const router = useRouter();
  const { todos, setTodos, addTodo, addNote, updateTodo, removeTodo, persistPositions } = useSupabaseTodos(userId);
  const { projects, updateProject } = useSupabaseProjects(userId);
  const { areas, updateArea } = useSupabaseAreas(userId);
  const { resources, updateResource } = useSupabaseResources(userId);

  const [tab, setTab] = useState<"overview" | "tasks" | "notes">("overview");
  const [panelOpen, setPanelOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const dropId = `para:${kind}:${id}`;
  const { setNodeRef, isOver } = useDroppable({ id: dropId });
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const backlogItems = useMemo(
    () => todos.filter(isInboxVisible).sort((a, b) => a.position - b.position),
    [todos]
  );

  const containerMapping = {
    projectId: kind === "project" ? id : null,
    areaId: kind === "area" ? id : null,
    resourceId: kind === "resource" ? id : null,
  };

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

  const project = kind === "project" ? projects.find((p) => p.id === id) : undefined;
  const container =
    kind === "project" ? project : kind === "area" ? areas.find((a) => a.id === id) : resources.find((r) => r.id === id);

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

    if (overIdStr === dropId) {
      setTodos((prev) => prev.map((t) => (t.id === activeIdStr ? { ...t, ...containerMapping } : t)));
      void updateTodo(activeIdStr, containerMapping);
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
      ordered.map((t) => ({ id: t.id, day: t.day, weekStart: t.weekStart, position: normalizedById.get(t.id)! }))
    );
  }

  if (!container) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 text-[15px] text-muted-foreground">불러오는 중...</div>
    );
  }

  const mappedHere = todos.filter((t) =>
    kind === "project" ? t.projectId === id : kind === "area" ? t.areaId === id : t.resourceId === id
  );
  const mappedTasks = mappedHere.filter((t) => t.kind === "task");
  const mappedNotes = mappedHere.filter((t) => t.kind === "note");
  const doneCount = mappedTasks.filter((t) => t.completed).length;
  const progress = mappedTasks.length ? Math.round((doneCount / mappedTasks.length) * 100) : 0;

  const Icon = KIND_ICON[kind];
  const paraContainer = container as ParaContainer;
  const statusLabel =
    kind === "project" ? (project!.status === "active" ? "진행중" : "완료") : paraContainer.archived ? "보관" : "활성";
  const statusDone = kind === "project" ? project!.status === "completed" : paraContainer.archived;

  function toggleStatus() {
    if (kind === "project") {
      const nextStatus = project!.status === "active" ? "completed" : "active";
      void updateProject(id, {
        status: nextStatus,
        completedAt: nextStatus === "completed" ? new Date().toISOString() : null,
      });
    } else if (kind === "area") {
      void updateArea(id, { archived: !paraContainer.archived });
    } else {
      void updateResource(id, { archived: !paraContainer.archived });
    }
  }

  function handleConvert(tid: string, newKind: TodoKind) {
    if (newKind === "note") {
      void updateTodo(tid, {
        kind: newKind,
        day: null,
        weekStart: null,
        startMinutes: null,
        durationMinutes: null,
        completed: false,
      });
    } else {
      void updateTodo(tid, { kind: newKind });
    }
  }

  const activeTodo = activeId ? todos.find((t) => t.id === activeId) ?? null : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={preferSpecificTargetCollision}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="min-h-screen pb-14 sm:pb-0 sm:pr-14">
        <div
          ref={setNodeRef}
          className={cn(
            "mx-auto w-full max-w-[720px] rounded-2xl px-4 py-6 transition-shadow sm:px-6",
            isOver && "ring-2 ring-primary ring-offset-2 ring-offset-background"
          )}
        >
          <button
            type="button"
            onClick={() => router.push("/para")}
            className="mb-4 flex items-center gap-1 text-[13px] font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            목록으로
          </button>

          <div className="mb-4 flex items-start gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
              <Icon className="size-5" />
            </div>
            <h1 className="mt-1.5 text-[22px] font-bold leading-tight tracking-tight">{container.name}</h1>
          </div>

          <div className="mb-5 flex flex-wrap items-center gap-6 rounded-2xl border border-border bg-card px-4 py-3.5">
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Status</span>
              <button
                type="button"
                onClick={toggleStatus}
                className={cn(
                  "w-fit rounded-full px-2.5 py-0.5 text-[11.5px] font-bold",
                  statusDone ? "bg-secondary text-muted-foreground" : "bg-accent text-accent-foreground"
                )}
              >
                {statusLabel}
              </button>
            </div>
            {kind === "project" ? (
              <>
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Due date</span>
                  <span className="text-[14.5px] font-semibold tabular-nums">{project!.dueDate ?? "미설정"}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Progress</span>
                  <span className="flex items-center gap-2">
                    <span className="h-[5px] w-[100px] overflow-hidden rounded-full bg-secondary">
                      <span className="block h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
                    </span>
                    <span className="text-[14.5px] font-semibold tabular-nums">{progress}%</span>
                  </span>
                </div>
              </>
            ) : null}
          </div>

          <div className="mb-4 flex gap-5 border-b border-border">
            {(["overview", "tasks", "notes"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={cn(
                  "relative pb-3 text-[14.5px] font-bold text-muted-foreground",
                  tab === t &&
                    "text-foreground after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:rounded-full after:bg-primary"
                )}
              >
                {t === "overview" ? "Overview" : t === "tasks" ? "Tasks" : "Notes"}
              </button>
            ))}
          </div>

          {tab === "overview" ? (
            <div className="flex flex-col">
              <div className="flex items-center gap-4 border-b border-border py-3">
                <span className="w-[130px] shrink-0 text-[14px] text-muted-foreground">Start date</span>
                <span className="text-[14px] tabular-nums">
                  {format(new Date(kind === "project" ? project!.startDate : container.createdAt), "yyyy-MM-dd")}
                </span>
              </div>
              {kind === "project" ? (
                <>
                  <div className="flex items-center gap-4 border-b border-border py-3">
                    <span className="w-[130px] shrink-0 text-[14px] text-muted-foreground">Completion date</span>
                    <span className={cn("text-[14px] tabular-nums", !project!.completedAt && "text-muted-foreground")}>
                      {project!.completedAt ? format(new Date(project!.completedAt), "yyyy-MM-dd") : "Empty"}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 py-3">
                    <span className="w-[130px] shrink-0 text-[14px] text-muted-foreground">Days left</span>
                    <span className="text-[14px] tabular-nums">
                      {project!.dueDate ? daysLeftLabel(project!.dueDate) : "—"}
                    </span>
                  </div>
                </>
              ) : null}
            </div>
          ) : null}

          {tab === "tasks" ? (
            <div className="flex flex-col divide-y divide-border/70">
              {mappedTasks.length === 0 ? (
                <p className="py-6 text-[14px] text-muted-foreground">
                  아직 매핑된 할 일이 없습니다. 오른쪽(모바일은 하단) &ldquo;할 일 보관함&rdquo;을 열어서 이{" "}
                  {PARA_KIND_LABELS[kind]}로 드래그해보세요.
                </p>
              ) : (
                mappedTasks.map((todo) => (
                  <TodoCard
                    key={todo.id}
                    todo={todo}
                    onToggle={(tid) => void updateTodo(tid, { completed: !todo.completed })}
                    onRemove={(tid) => void removeTodo(tid)}
                    onEdit={(tid, content) => void updateTodo(tid, { content })}
                    onMemoEdit={(tid, memo) => void updateTodo(tid, { memo: memo || null })}
                    onConvert={handleConvert}
                  />
                ))
              )}
            </div>
          ) : null}

          {tab === "notes" ? (
            <div className="flex flex-col gap-2.5">
              {mappedNotes.map((note) => (
                <TodoCard
                  key={note.id}
                  todo={note}
                  onRemove={(tid) => void removeTodo(tid)}
                  onEdit={(tid, content) => void updateTodo(tid, { content })}
                  onMemoEdit={(tid, memo) => void updateTodo(tid, { memo: memo || null })}
                  onConvert={handleConvert}
                />
              ))}
              <AddContainerForm
                placeholder="새 노트 추가"
                onAdd={(content) => void addNote(content, nextPosition(mappedNotes), containerMapping)}
              />
            </div>
          ) : null}
        </div>
      </div>

      {panelOpen ? (
        <SortableContext items={backlogItems.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          <TodoPanel
            items={backlogItems}
            onToggle={(tid) => {
              const current = todos.find((t) => t.id === tid);
              if (current) void updateTodo(tid, { completed: !current.completed });
            }}
            onRemove={(tid) => void removeTodo(tid)}
            onEdit={(tid, content) => void updateTodo(tid, { content })}
            onMemoEdit={(tid, memo) => void updateTodo(tid, { memo: memo || null })}
            onConvert={handleConvert}
            onAdd={(content, itemKind) =>
              itemKind === "note"
                ? void addNote(content, nextPosition(backlogItems))
                : void addTodo(content, nextPosition(backlogItems))
            }
            onClose={() => setPanelOpen(false)}
            getBadge={badgeFor}
          />
        </SortableContext>
      ) : null}

      <DragOverlay>{activeTodo ? <TodoCard todo={activeTodo} overlay /> : null}</DragOverlay>

      <AppNavRail activePage="para" panelOpen={panelOpen} onTogglePanel={() => setPanelOpen((open) => !open)} />
    </DndContext>
  );
}
