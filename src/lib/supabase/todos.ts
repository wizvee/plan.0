"use client";

import { useCallback, useEffect, useState } from "react";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/client";
import type { DayKey, Todo } from "@/lib/types";

interface TodoRow {
  id: string;
  user_id: string;
  content: string;
  day: DayKey | null;
  week_start: string | null;
  completed: boolean;
  position: number;
  created_at: string;
}

function fromRow(row: TodoRow): Todo {
  return {
    id: row.id,
    content: row.content,
    day: row.day,
    weekStart: row.week_start,
    completed: row.completed,
    position: row.position,
    createdAt: row.created_at,
  };
}

type UpdatablePatch = Partial<Pick<Todo, "content" | "completed" | "day" | "weekStart" | "position">>;

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

  const addTodo = useCallback(
    async (content: string, position: number) => {
      const trimmed = content.trim();
      if (!trimmed) return;

      const optimisticId = crypto.randomUUID();
      setTodos((prev) => [
        ...prev,
        {
          id: optimisticId,
          content: trimmed,
          day: null,
          weekStart: null,
          completed: false,
          position,
          createdAt: new Date().toISOString(),
        },
      ]);

      const { data, error } = await supabase
        .from("todos")
        .insert({ user_id: userId, content: trimmed, position })
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

  const updateTodo = useCallback(
    async (id: string, patch: UpdatablePatch) => {
      setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));

      const dbPatch: Record<string, unknown> = {};
      if (patch.content !== undefined) dbPatch.content = patch.content;
      if (patch.completed !== undefined) dbPatch.completed = patch.completed;
      if (patch.day !== undefined) dbPatch.day = patch.day;
      if (patch.weekStart !== undefined) dbPatch.week_start = patch.weekStart;
      if (patch.position !== undefined) dbPatch.position = patch.position;

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

  return { todos, setTodos, loading, addTodo, updateTodo, removeTodo, persistPositions };
}
