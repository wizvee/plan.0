"use client";

import { useCallback, useEffect, useState } from "react";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/client";
import type { ParaKind, Todo, TodoKind } from "@/lib/types";

interface TodoRow {
  id: string;
  user_id: string;
  content: string;
  kind: TodoKind;
  scheduled_date: string | null;
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
    scheduledDate: row.scheduled_date,
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
    | "scheduledDate"
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

/** 새 항목의 PARA 매핑 · 캘린더 배치. 비우면 Inbox에 매핑 없이 들어간다. */
interface NewItemFields {
  projectId?: string | null;
  areaId?: string | null;
  resourceId?: string | null;
  scheduledDate?: string | null;
  startMinutes?: number | null;
  durationMinutes?: number | null;
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

  /** 새 항목을 만들고 그 id를 돌려준다(빈 내용이거나 저장에 실패하면 undefined). */
  const addItem = useCallback(
    async (content: string, position: number, kind: TodoKind, fields?: NewItemFields): Promise<string | undefined> => {
      const trimmed = content.trim();
      if (!trimmed) return undefined;

      // id를 클라이언트에서 정해서 insert — 만든 직후 이 id를 다른 행(회고의 converted_todo_id 등)이 바로
      // 가리킬 수 있고, Realtime INSERT 이벤트가 응답보다 먼저 와도 같은 id라 중복되지 않는다.
      const id = crypto.randomUUID();
      setTodos((prev) => [
        ...prev,
        {
          id,
          content: trimmed,
          kind,
          scheduledDate: fields?.scheduledDate ?? null,
          completed: false,
          position,
          createdAt: new Date().toISOString(),
          startMinutes: fields?.startMinutes ?? null,
          durationMinutes: fields?.durationMinutes ?? null,
          url: null,
          memo: null,
          projectId: fields?.projectId ?? null,
          areaId: fields?.areaId ?? null,
          resourceId: fields?.resourceId ?? null,
        },
      ]);

      const { data, error } = await supabase
        .from("todos")
        .insert({
          id,
          user_id: userId,
          content: trimmed,
          position,
          kind,
          project_id: fields?.projectId ?? null,
          area_id: fields?.areaId ?? null,
          resource_id: fields?.resourceId ?? null,
          scheduled_date: fields?.scheduledDate ?? null,
          start_minutes: fields?.startMinutes ?? null,
          duration_minutes: fields?.durationMinutes ?? null,
        })
        .select()
        .single();

      if (error || !data) {
        setTodos((prev) => prev.filter((t) => t.id !== id));
        return undefined;
      }
      setTodos((prev) => prev.map((t) => (t.id === id ? fromRow(data as TodoRow) : t)));
      return id;
    },
    [supabase, userId]
  );

  const addTodo = useCallback(
    (content: string, position: number, fields?: NewItemFields) => addItem(content, position, "task", fields),
    [addItem]
  );

  const addNote = useCallback(
    (content: string, position: number, fields?: NewItemFields) => addItem(content, position, "note", fields),
    [addItem]
  );

  const updateTodo = useCallback(
    async (id: string, patch: UpdatablePatch) => {
      setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));

      const dbPatch: Record<string, unknown> = {};
      if (patch.content !== undefined) dbPatch.content = patch.content;
      if (patch.kind !== undefined) dbPatch.kind = patch.kind;
      if (patch.completed !== undefined) dbPatch.completed = patch.completed;
      if (patch.scheduledDate !== undefined) dbPatch.scheduled_date = patch.scheduledDate;
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
    async (changes: { id: string; position: number }[]) => {
      await Promise.all(
        changes.map(({ id, position }) => supabase.from("todos").update({ position }).eq("id", id))
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

  /**
   * PARA 컨테이너 하나에 매핑된 할 일 · 노트를 전부 지운다(컨테이너 "함께 삭제", PARA-MANAGE-PLAN.md).
   * 낙관적으로 빼지 않고 DB 삭제가 성공한 뒤에 로컬에서 뺀다 — 실패하면 컨테이너 삭제를 멈춰야 해서.
   * 하위 할 일 · 회고는 DB cascade. 지운 할 일 id 목록을 돌려준다(실패하면 null).
   */
  const removeTodosMappedTo = useCallback(
    async (kind: ParaKind, containerId: string): Promise<string[] | null> => {
      const { data, error } = await supabase.from("todos").delete().eq(MAPPING_COLUMN[kind], containerId).select("id");
      if (error) return null;
      const ids = new Set((data as { id: string }[]).map((row) => row.id));
      setTodos((prev) => prev.filter((t) => !ids.has(t.id) && t[MAPPING_FIELD[kind]] !== containerId));
      return Array.from(ids);
    },
    [supabase]
  );

  /** 컨테이너를 지운 뒤 로컬 매핑만 비운다 — DB는 FK `on delete set null`이 처리하고, Realtime UPDATE를 기다리지 않게. */
  const clearMappingTo = useCallback((kind: ParaKind, containerId: string) => {
    const field = MAPPING_FIELD[kind];
    setTodos((prev) => prev.map((t) => (t[field] === containerId ? { ...t, [field]: null } : t)));
  }, []);

  return {
    todos,
    setTodos,
    loading,
    addTodo,
    addNote,
    updateTodo,
    removeTodo,
    persistPositions,
    removeTodosMappedTo,
    clearMappingTo,
  };
}

const MAPPING_COLUMN: Record<ParaKind, "project_id" | "area_id" | "resource_id"> = {
  project: "project_id",
  area: "area_id",
  resource: "resource_id",
};

const MAPPING_FIELD: Record<ParaKind, "projectId" | "areaId" | "resourceId"> = {
  project: "projectId",
  area: "areaId",
  resource: "resourceId",
};
