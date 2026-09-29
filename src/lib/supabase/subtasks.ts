"use client";

import { useCallback, useEffect, useState } from "react";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/client";
import type { Subtask } from "@/lib/types";

interface SubtaskRow {
  id: string;
  user_id: string;
  todo_id: string;
  content: string;
  completed: boolean;
  position: number;
  created_at: string;
  carried_at: string | null;
}

function fromRow(row: SubtaskRow): Subtask {
  return {
    id: row.id,
    todoId: row.todo_id,
    content: row.content,
    completed: row.completed,
    position: row.position,
    createdAt: row.created_at,
    carriedAt: row.carried_at ?? null,
  };
}

type UpdatablePatch = Partial<Pick<Subtask, "content" | "completed" | "position">>;

/**
 * 하위 할 일(`todo_subtasks`) 조회 + Realtime 구독 + 낙관적 추가/수정/삭제.
 * `todos.ts`와 같은 모양 — `AppDataProvider`에서 한 번만 호출된다.
 */
export function useSupabaseSubtasks(userId: string) {
  const [supabase] = useState(() => createClient());
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    supabase
      .from("todo_subtasks")
      .select("*")
      .then(({ data, error }) => {
        if (!active) return;
        if (!error && data) setSubtasks((data as SubtaskRow[]).map(fromRow));
        setLoading(false);
      });

    const channel = supabase
      .channel(`subtasks-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "todo_subtasks", filter: `user_id=eq.${userId}` },
        (payload: RealtimePostgresChangesPayload<SubtaskRow>) => {
          setSubtasks((prev) => {
            // DELETE는 old에 id만 온다 (부모 할 일 삭제로 cascade된 행도 이 경로로 들어옴)
            if (payload.eventType === "DELETE") {
              const oldId = (payload.old as Partial<SubtaskRow>).id;
              return prev.filter((s) => s.id !== oldId);
            }
            const next = fromRow(payload.new as SubtaskRow);
            const exists = prev.some((s) => s.id === next.id);
            return exists ? prev.map((s) => (s.id === next.id ? next : s)) : [...prev, next];
          });
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [supabase, userId]);

  /** 저장에 성공하면 true (빈 내용이거나 실패하면 false). */
  const addSubtask = useCallback(
    async (todoId: string, content: string, position: number): Promise<boolean> => {
      const trimmed = content.trim();
      if (!trimmed) return false;

      // id를 클라이언트에서 정해서 insert — Realtime INSERT 이벤트가 응답보다 먼저 와도 같은 id라 중복되지 않는다.
      const id = crypto.randomUUID();
      setSubtasks((prev) => [
        ...prev,
        {
          id,
          todoId,
          content: trimmed,
          completed: false,
          position,
          createdAt: new Date().toISOString(),
          carriedAt: null,
        },
      ]);

      const { error } = await supabase
        .from("todo_subtasks")
        .insert({ id, user_id: userId, todo_id: todoId, content: trimmed, position });

      if (error) setSubtasks((prev) => prev.filter((s) => s.id !== id));
      return !error;
    },
    [supabase, userId]
  );

  const updateSubtask = useCallback(
    async (id: string, patch: UpdatablePatch) => {
      setSubtasks((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));

      const { error } = await supabase.from("todo_subtasks").update(patch).eq("id", id);
      if (error) {
        // 실패하면 DB 값으로 되돌린다 (행이 이미 지워졌으면 로컬에서도 뺀다)
        const { data } = await supabase.from("todo_subtasks").select("*").eq("id", id).maybeSingle();
        setSubtasks((prev) =>
          data ? prev.map((s) => (s.id === id ? fromRow(data as SubtaskRow) : s)) : prev.filter((s) => s.id !== id)
        );
      }
    },
    [supabase]
  );

  const removeSubtask = useCallback(
    async (id: string) => {
      setSubtasks((prev) => prev.filter((s) => s.id !== id));
      await supabase.from("todo_subtasks").delete().eq("id", id);
    },
    [supabase]
  );

  /** 하위 할 일들을 "넘김"으로 표시한다(넘긴 시각 저장). 되돌리지 않는다. */
  const markSubtasksCarried = useCallback(
    async (ids: string[]) => {
      if (ids.length === 0) return;
      const carriedAt = new Date().toISOString();
      const idSet = new Set(ids);
      setSubtasks((prev) => prev.map((s) => (idSet.has(s.id) ? { ...s, carriedAt } : s)));
      await supabase.from("todo_subtasks").update({ carried_at: carriedAt }).in("id", ids);
    },
    [supabase]
  );

  /** 순서 변경 결과(새 position)를 한 번에 반영하고 저장한다. */
  const persistSubtaskPositions = useCallback(
    async (changes: { id: string; position: number }[]) => {
      const byId = new Map(changes.map((c) => [c.id, c.position]));
      setSubtasks((prev) => prev.map((s) => (byId.has(s.id) ? { ...s, position: byId.get(s.id)! } : s)));
      await Promise.all(
        changes.map(({ id, position }) => supabase.from("todo_subtasks").update({ position }).eq("id", id))
      );
    },
    [supabase]
  );

  /** 부모 할 일을 지울 때 로컬 상태에서 즉시 뺀다 (DB는 cascade로 지워짐 — Realtime 이벤트를 기다리지 않게). */
  const dropSubtasksOf = useCallback((todoId: string) => {
    setSubtasks((prev) => prev.filter((s) => s.todoId !== todoId));
  }, []);

  /** 할 일 여러 개를 한 번에 지울 때(PARA 컨테이너 "함께 삭제") 로컬에서 그 하위를 뺀다 — DB는 cascade. */
  const dropSubtasksOfMany = useCallback((todoIds: string[]) => {
    const removed = new Set(todoIds);
    setSubtasks((prev) => prev.filter((s) => !removed.has(s.todoId)));
  }, []);

  return {
    subtasks,
    loading,
    addSubtask,
    updateSubtask,
    removeSubtask,
    markSubtasksCarried,
    persistSubtaskPositions,
    dropSubtasksOf,
    dropSubtasksOfMany,
  };
}
