"use client";

import { useCallback, useEffect, useState } from "react";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/client";
import { fetchAllRows } from "@/lib/supabase/fetch-all";
import type { WeeklyGoal } from "@/lib/types";

interface GoalRow {
  id: string;
  user_id: string;
  week_start: string;
  content: string;
  project_id: string | null;
  area_id: string | null;
  resource_id: string | null;
  position: number;
  created_at: string;
}

function fromRow(row: GoalRow): WeeklyGoal {
  return {
    id: row.id,
    weekStart: row.week_start,
    content: row.content,
    projectId: row.project_id,
    areaId: row.area_id,
    resourceId: row.resource_id,
    position: row.position,
    createdAt: row.created_at,
  };
}

export type GoalParaPatch = Pick<WeeklyGoal, "projectId" | "areaId" | "resourceId">;
type UpdatablePatch = Partial<Pick<WeeklyGoal, "content" | "position"> & GoalParaPatch>;

/**
 * 주간 목표(`weekly_goals`) 조회 + Realtime 구독 + 낙관적 추가/수정/삭제.
 * `subtasks.ts`와 같은 모양 — `AppDataProvider`에서 한 번만 호출된다. (GOALS-PLAN.md)
 */
export function useSupabaseGoals(userId: string) {
  const [supabase] = useState(() => createClient());
  const [goals, setGoals] = useState<WeeklyGoal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    fetchAllRows(supabase, "weekly_goals").then(({ data, error }) => {
      if (!active) return;
      if (!error && data) setGoals((data as GoalRow[]).map(fromRow));
      setLoading(false);
    });

    const channel = supabase
      .channel(`goals-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "weekly_goals", filter: `user_id=eq.${userId}` },
        (payload: RealtimePostgresChangesPayload<GoalRow>) => {
          setGoals((prev) => {
            if (payload.eventType === "DELETE") {
              const oldId = (payload.old as Partial<GoalRow>).id;
              return prev.filter((g) => g.id !== oldId);
            }
            const next = fromRow(payload.new as GoalRow);
            const exists = prev.some((g) => g.id === next.id);
            return exists ? prev.map((g) => (g.id === next.id ? next : g)) : [...prev, next];
          });
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [supabase, userId]);

  /** 새 목표를 만들고 id를 돌려준다(빈 내용이거나 저장에 실패하면 undefined). */
  const addGoal = useCallback(
    async (weekStart: string, content: string, position: number, para?: Partial<GoalParaPatch>) => {
      const trimmed = content.trim();
      if (!trimmed) return undefined;

      // id를 클라이언트에서 정해서 insert — Realtime INSERT 이벤트가 응답보다 먼저 와도 같은 id라 중복되지 않는다.
      const id = crypto.randomUUID();
      const projectId = para?.projectId ?? null;
      const areaId = para?.areaId ?? null;
      const resourceId = para?.resourceId ?? null;
      setGoals((prev) => [
        ...prev,
        { id, weekStart, content: trimmed, projectId, areaId, resourceId, position, createdAt: new Date().toISOString() },
      ]);

      const { error } = await supabase.from("weekly_goals").insert({
        id,
        user_id: userId,
        week_start: weekStart,
        content: trimmed,
        project_id: projectId,
        area_id: areaId,
        resource_id: resourceId,
        position,
      });

      if (error) {
        setGoals((prev) => prev.filter((g) => g.id !== id));
        return undefined;
      }
      return id;
    },
    [supabase, userId]
  );

  const updateGoal = useCallback(
    async (id: string, patch: UpdatablePatch) => {
      setGoals((prev) => prev.map((g) => (g.id === id ? { ...g, ...patch } : g)));

      const dbPatch: Record<string, unknown> = {};
      if (patch.content !== undefined) dbPatch.content = patch.content;
      if (patch.position !== undefined) dbPatch.position = patch.position;
      if (patch.projectId !== undefined) dbPatch.project_id = patch.projectId;
      if (patch.areaId !== undefined) dbPatch.area_id = patch.areaId;
      if (patch.resourceId !== undefined) dbPatch.resource_id = patch.resourceId;

      const { error } = await supabase.from("weekly_goals").update(dbPatch).eq("id", id);
      if (error) {
        // 실패하면 DB 값으로 되돌린다 (행이 이미 지워졌으면 로컬에서도 뺀다)
        const { data } = await supabase.from("weekly_goals").select("*").eq("id", id).maybeSingle();
        setGoals((prev) =>
          data ? prev.map((g) => (g.id === id ? fromRow(data as GoalRow) : g)) : prev.filter((g) => g.id !== id)
        );
      }
    },
    [supabase]
  );

  const removeGoal = useCallback(
    async (id: string) => {
      setGoals((prev) => prev.filter((g) => g.id !== id));
      await supabase.from("weekly_goals").delete().eq("id", id);
    },
    [supabase]
  );

  return { goals, loading, addGoal, updateGoal, removeGoal };
}
