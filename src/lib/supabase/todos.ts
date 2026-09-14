"use client";

import { useCallback, useEffect, useState } from "react";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/client";
import type { DayKey, Todo, TodoKind } from "@/lib/types";

interface TodoRow {
  id: string;
  user_id: string;
  content: string;
  kind: TodoKind;
  day: DayKey | null;
  week_start: string | null;
  completed: boolean;
  position: number;
  created_at: string;
  start_minutes: number | null;
  duration_minutes: number | null;
  url: string | null;
  memo: string | null;
  project_id: string | null;
  area_id: string | null;
  resource_id: string | null;
}

function fromRow(row: TodoRow): Todo {
  return {
    id: row.id,
    content: row.content,
    kind: row.kind,
    day: row.day,
    weekStart: row.week_start,
    completed: row.completed,
    position: row.position,
    createdAt: row.created_at,
    startMinutes: row.start_minutes,
    durationMinutes: row.duration_minutes,
    url: row.url,
    memo: row.memo,
    projectId: row.project_id,
    areaId: row.area_id,
    resourceId: row.resource_id,
  };
}

type UpdatablePatch = Partial<
  Pick<
    Todo,
    | "content"
    | "kind"
    | "completed"
    | "day"
    | "weekStart"
    | "position"
    | "startMinutes"
    | "durationMinutes"
    | "url"
    | "memo"
    | "projectId"
    | "areaId"
    | "resourceId"
  >
>;

interface NewItemMapping {
  projectId?: string | null;
  areaId?: string | null;
  resourceId?: string | null;
}

export function useSupabaseTodos(userId: string) {
  const [supabase] = useState(() => createClient());
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    supabase
      .from("todos")
      .select("*")
      .then(({ data, error }) => {
        if (!active) return;
        if (!error && data) setTodos((data as TodoRow[]).map(fromRow));
        setLoading(false);
      });

    const channel = supabase
      .channel(`todos-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "todos", filter: `user_id=eq.${userId}` },
        (payload: RealtimePostgresChangesPayload<TodoRow>) => {
          setTodos((prev) => {
            if (payload.eventType === "DELETE") {
              const oldId = (payload.old as Partial<TodoRow>).id;
              return prev.filter((t) => t.id !== oldId);
            }
            const next = fromRow(payload.new as TodoRow);
            const exists = prev.some((t) => t.id === next.id);
            return exists ? prev.map((t) => (t.id === next.id ? next : t)) : [...prev, next];
          });
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [supabase, userId]);

  const addItem = useCallback(
    async (content: string, position: number, kind: TodoKind, mapping?: NewItemMapping) => {
      const trimmed = content.trim();
      if (!trimmed) return;

      const optimisticId = crypto.randomUUID();
      setTodos((prev) => [
        ...prev,
        {
          id: optimisticId,
          content: trimmed,
          kind,
          day: null,
          weekStart: null,
          completed: false,
          position,
          createdAt: new Date().toISOString(),
          startMinutes: null,
          durationMinutes: null,
          url: null,
          memo: null,
          projectId: mapping?.projectId ?? null,
          areaId: mapping?.areaId ?? null,
          resourceId: mapping?.resourceId ?? null,
        },
      ]);

      const { data, error } = await supabase
        .from("todos")
        .insert({
          user_id: userId,
          content: trimmed,
          position,
          kind,
          project_id: mapping?.projectId ?? null,
          area_id: mapping?.areaId ?? null,
          resource_id: mapping?.resourceId ?? null,
        })
        .select()
        .single();

      if (error || !data) {
        setTodos((prev) => prev.filter((t) => t.id !== optimisticId));
        return;
      }
      setTodos((prev) => prev.map((t) => (t.id === optimisticId ? fromRow(data as TodoRow) : t)));
    },
    [supabase, userId]
  );

  const addTodo = useCallback((content: string, position: number) => addItem(content, position, "task"), [addItem]);

  const addNote = useCallback(
    (content: string, position: number, mapping?: NewItemMapping) => addItem(content, position, "note", mapping),
    [addItem]
  );

  const updateTodo = useCallback(
    async (id: string, patch: UpdatablePatch) => {
      setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));

      const dbPatch: Record<string, unknown> = {};
      if (patch.content !== undefined) dbPatch.content = patch.content;
      if (patch.kind !== undefined) dbPatch.kind = patch.kind;
      if (patch.completed !== undefined) dbPatch.completed = patch.completed;
      if (patch.day !== undefined) dbPatch.day = patch.day;
      if (patch.weekStart !== undefined) dbPatch.week_start = patch.weekStart;
      if (patch.position !== undefined) dbPatch.position = patch.position;
      if (patch.startMinutes !== undefined) dbPatch.start_minutes = patch.startMinutes;
      if (patch.durationMinutes !== undefined) dbPatch.duration_minutes = patch.durationMinutes;
      if (patch.url !== undefined) dbPatch.url = patch.url;
      if (patch.memo !== undefined) dbPatch.memo = patch.memo;
      if (patch.projectId !== undefined) dbPatch.project_id = patch.projectId;
      if (patch.areaId !== undefined) dbPatch.area_id = patch.areaId;
      if (patch.resourceId !== undefined) dbPatch.resource_id = patch.resourceId;

      await supabase.from("todos").update(dbPatch).eq("id", id);
    },
    [supabase]
  );

  const persistPositions = useCallback(
    async (changes: { id: string; day: DayKey | null; weekStart: string | null; position: number }[]) => {
      await Promise.all(
        changes.map(({ id, day, weekStart, position }) =>
          supabase.from("todos").update({ day, week_start: weekStart, position }).eq("id", id)
        )
      );
    },
    [supabase]
  );

  const removeTodo = useCallback(
    async (id: string) => {
      setTodos((prev) => prev.filter((t) => t.id !== id));
      await supabase.from("todos").delete().eq("id", id);
    },
    [supabase]
  );

  return { todos, setTodos, loading, addTodo, addNote, updateTodo, removeTodo, persistPositions };
}
