"use client";

import { useCallback, useEffect, useState } from "react";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/client";
import type { Reflection, ReflectionKind } from "@/lib/types";

interface ReflectionRow {
  id: string;
  user_id: string;
  todo_id: string | null;
  project_id: string | null;
  kind: ReflectionKind;
  content: string;
  converted_todo_id: string | null;
  created_at: string;
}

function fromRow(row: ReflectionRow): Reflection {
  return {
    id: row.id,
    todoId: row.todo_id,
    projectId: row.project_id,
    kind: row.kind,
    content: row.content,
    convertedTodoId: row.converted_todo_id,
    createdAt: row.created_at,
  };
}

/** 회고가 붙는 곳 — 할 일 또는 프로젝트(직접). */
export type ReflectionOwner = { todoId: string } | { projectId: string };

type UpdatablePatch = Partial<Pick<Reflection, "content" | "kind" | "convertedTodoId">>;

/**
 * 회고(`todo_reflections`) 조회 + Realtime 구독 + 낙관적 추가/수정/삭제.
 * `subtasks.ts`와 같은 모양 — `AppDataProvider`에서 한 번만 호출된다.
 */
export function useSupabaseReflections(userId: string) {
  const [supabase] = useState(() => createClient());
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    supabase
      .from("todo_reflections")
      .select("*")
      .then(({ data, error }) => {
        if (!active) return;
        if (!error && data) setReflections((data as ReflectionRow[]).map(fromRow));
        setLoading(false);
      });

    const channel = supabase
      .channel(`reflections-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "todo_reflections", filter: `user_id=eq.${userId}` },
        (payload: RealtimePostgresChangesPayload<ReflectionRow>) => {
          setReflections((prev) => {
            // DELETE는 old에 id만 온다 (할 일 · 프로젝트 삭제로 cascade된 행도 이 경로로 들어옴)
            if (payload.eventType === "DELETE") {
              const oldId = (payload.old as Partial<ReflectionRow>).id;
              return prev.filter((r) => r.id !== oldId);
            }
            const next = fromRow(payload.new as ReflectionRow);
            const exists = prev.some((r) => r.id === next.id);
            return exists ? prev.map((r) => (r.id === next.id ? next : r)) : [...prev, next];
          });
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [supabase, userId]);

  const addReflection = useCallback(
    async (owner: ReflectionOwner, kind: ReflectionKind, content: string) => {
      const trimmed = content.trim();
      if (!trimmed) return;

      const todoId = "todoId" in owner ? owner.todoId : null;
      const projectId = "projectId" in owner ? owner.projectId : null;
      // id를 클라이언트에서 정해서 insert — Realtime INSERT 이벤트가 응답보다 먼저 와도 같은 id라 중복되지 않는다.
      const id = crypto.randomUUID();
      setReflections((prev) => [
        ...prev,
        {
          id,
          todoId,
          projectId,
          kind,
          content: trimmed,
          convertedTodoId: null,
          createdAt: new Date().toISOString(),
        },
      ]);

      const { error } = await supabase
        .from("todo_reflections")
        .insert({ id, user_id: userId, todo_id: todoId, project_id: projectId, kind, content: trimmed });

      if (error) setReflections((prev) => prev.filter((r) => r.id !== id));
    },
    [supabase, userId]
  );

  const updateReflection = useCallback(
    async (id: string, patch: UpdatablePatch) => {
      setReflections((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));

      const dbPatch: Record<string, unknown> = {};
      if (patch.content !== undefined) dbPatch.content = patch.content;
      if (patch.kind !== undefined) dbPatch.kind = patch.kind;
      if (patch.convertedTodoId !== undefined) dbPatch.converted_todo_id = patch.convertedTodoId;

      const { error } = await supabase.from("todo_reflections").update(dbPatch).eq("id", id);
      if (error) {
        // 실패하면 DB 값으로 되돌린다 (행이 이미 지워졌으면 로컬에서도 뺀다)
        const { data } = await supabase.from("todo_reflections").select("*").eq("id", id).maybeSingle();
        setReflections((prev) =>
          data ? prev.map((r) => (r.id === id ? fromRow(data as ReflectionRow) : r)) : prev.filter((r) => r.id !== id)
        );
      }
    },
    [supabase]
  );

  const removeReflection = useCallback(
    async (id: string) => {
      setReflections((prev) => prev.filter((r) => r.id !== id));
      await supabase.from("todo_reflections").delete().eq("id", id);
    },
    [supabase]
  );

  /**
   * 할 일을 지울 때 로컬 상태를 바로 맞춘다 — 그 할 일의 회고는 빼고(DB는 cascade), 그 할 일을 가리키던
   * "다음엔 → 할 일로" 표시는 비운다(DB는 on delete set null). Realtime 이벤트를 기다리지 않게.
   */
  const dropReflectionsOfTodo = useCallback((todoId: string) => {
    setReflections((prev) =>
      prev
        .filter((r) => r.todoId !== todoId)
        .map((r) => (r.convertedTodoId === todoId ? { ...r, convertedTodoId: null } : r))
    );
  }, []);

  return { reflections, loading, addReflection, updateReflection, removeReflection, dropReflectionsOfTodo };
}
