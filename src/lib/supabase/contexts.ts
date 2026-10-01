"use client";

import { useCallback, useEffect, useState } from "react";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/client";
import { fetchAllRows } from "@/lib/supabase/fetch-all";
import { nextUnusedColor } from "@/lib/context-color";
import type { Context, ContextColor } from "@/lib/types";

interface ContextRow {
  id: string;
  user_id: string;
  name: string;
  key: string;
  position: number;
  is_default: boolean;
  color: ContextColor;
  is_sleep: boolean;
}

interface UserContextRow {
  user_id: string;
  context_id: string | null;
  notify_on_change: boolean;
  changed_at: string;
}

function fromRow(row: ContextRow): Context {
  return {
    id: row.id,
    name: row.name,
    key: row.key,
    position: row.position,
    isDefault: row.is_default,
    // 마이그레이션(20261001_context_balance.sql) 전이면 컬럼이 없다 — 회색 · 수면 아님
    color: row.color ?? "gray",
    isSleep: row.is_sleep ?? false,
  };
}

/** 현재 컨텍스트 — 단축어(집중 모드)가 바꾼다. 행이 없거나 contextId가 null이면 "전부". */
export interface CurrentContext {
  contextId: string | null;
  notifyOnChange: boolean;
  changedAt: string | null;
}

const EMPTY_CURRENT: CurrentContext = { contextId: null, notifyOnChange: true, changedAt: null };

/** 단축어 키 규칙 (DB check와 같음) */
export const CONTEXT_KEY_PATTERN = /^[a-z0-9_-]{1,32}$/;

/** `/api/context`가 따로 쓰는 값 — 전부(`all`) · 기본(`default`). 컨텍스트 키로 쓰면 그 컨텍스트로 못 바꾼다 */
const RESERVED_CONTEXT_KEYS = ["all", "default"];

/**
 * 컨텍스트 목록(`contexts`) + 현재 컨텍스트(`user_context`) 조회 · Realtime · 수정 (WEBAPP-PLAN.md).
 * `AppDataProvider`에서 한 번만 호출된다. 현재 컨텍스트는 단축어가 서버에서 바꾸므로 Realtime으로 받는다.
 */
export function useSupabaseContexts(userId: string) {
  const [supabase] = useState(() => createClient());
  const [contexts, setContexts] = useState<Context[]>([]);
  const [current, setCurrent] = useState<CurrentContext>(EMPTY_CURRENT);

  useEffect(() => {
    let active = true;

    fetchAllRows(supabase, "contexts").then(({ data, error }) => {
      if (active && !error && data) setContexts((data as ContextRow[]).map(fromRow));
    });
    supabase
      .from("user_context")
      .select("*")
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active || error || !data) return;
        const row = data as UserContextRow;
        setCurrent({ contextId: row.context_id, notifyOnChange: row.notify_on_change, changedAt: row.changed_at });
      });

    const channel = supabase
      .channel(`contexts-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "contexts", filter: `user_id=eq.${userId}` },
        (payload: RealtimePostgresChangesPayload<ContextRow>) => {
          setContexts((prev) => {
            if (payload.eventType === "DELETE") {
              const oldId = (payload.old as Partial<ContextRow>).id;
              return prev.filter((c) => c.id !== oldId);
            }
            const next = fromRow(payload.new as ContextRow);
            return prev.some((c) => c.id === next.id) ? prev.map((c) => (c.id === next.id ? next : c)) : [...prev, next];
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_context", filter: `user_id=eq.${userId}` },
        (payload: RealtimePostgresChangesPayload<UserContextRow>) => {
          if (payload.eventType === "DELETE") return setCurrent(EMPTY_CURRENT);
          const row = payload.new as UserContextRow;
          setCurrent({ contextId: row.context_id, notifyOnChange: row.notify_on_change, changedAt: row.changed_at });
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [supabase, userId]);

  /** 새 컨텍스트. 실패 사유(키 중복 · 형식)를 문자열로 돌려준다 — 성공이면 null. */
  const addContext = useCallback(
    async (name: string, key: string): Promise<string | null> => {
      const trimmedName = name.trim();
      const trimmedKey = key.trim().toLowerCase();
      if (!trimmedName) return "이름을 입력하세요";
      if (!CONTEXT_KEY_PATTERN.test(trimmedKey)) return "키는 영문 소문자 · 숫자 · - · _ 만 (32자 이하)";
      if (RESERVED_CONTEXT_KEYS.includes(trimmedKey)) return `"${trimmedKey}"는 단축어용으로 예약된 키예요`;

      const position = contexts.length === 0 ? 0 : Math.max(...contexts.map((c) => c.position)) + 1;
      const color = nextUnusedColor(contexts.map((c) => c.color));

      const { data, error } = await supabase
        .from("contexts")
        .insert({ user_id: userId, name: trimmedName, key: trimmedKey, position, color })
        .select()
        .single();
      if (error || !data) return error?.code === "23505" ? "같은 키가 이미 있어요" : "추가하지 못했어요";
      const next = fromRow(data as ContextRow);
      setContexts((prev) => (prev.some((c) => c.id === next.id) ? prev : [...prev, next]));
      return null;
    },
    [supabase, userId, contexts]
  );

  const renameContext = useCallback(
    async (id: string, name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      setContexts((prev) => prev.map((c) => (c.id === id ? { ...c, name: trimmed } : c)));
      await supabase.from("contexts").update({ name: trimmed }).eq("id", id);
    },
    [supabase]
  );

  /** 기본 컨텍스트 바꾸기 — 사용자당 기본은 하나(부분 unique 인덱스)라 기존 기본을 먼저 끈다. */
  const setDefaultContext = useCallback(
    async (id: string) => {
      setContexts((prev) => prev.map((c) => ({ ...c, isDefault: c.id === id })));
      await supabase.from("contexts").update({ is_default: false }).eq("user_id", userId).eq("is_default", true);
      await supabase.from("contexts").update({ is_default: true }).eq("id", id);
    },
    [supabase, userId]
  );

  const setContextColor = useCallback(
    async (id: string, color: ContextColor) => {
      setContexts((prev) => prev.map((c) => (c.id === id ? { ...c, color } : c)));
      await supabase.from("contexts").update({ color }).eq("id", id);
    },
    [supabase]
  );

  /**
   * 수면으로 세기 켜기 · 끄기 — 사용자당 하나(부분 unique 인덱스)라 켤 때는 다른 수면 표시를 먼저 끈다.
   * (BALANCE-PLAN.md 4번)
   */
  const setSleepContext = useCallback(
    async (id: string, isSleep: boolean) => {
      setContexts((prev) => prev.map((c) => ({ ...c, isSleep: c.id === id ? isSleep : isSleep ? false : c.isSleep })));
      if (isSleep) {
        await supabase.from("contexts").update({ is_sleep: false }).eq("user_id", userId).eq("is_sleep", true);
      }
      await supabase.from("contexts").update({ is_sleep: isSleep }).eq("id", id);
    },
    [supabase, userId]
  );

  /** 삭제 — 이 컨텍스트를 고른 PARA와 현재 컨텍스트는 DB에서 null(기본 / 전부)로 돌아간다. 기본은 못 지운다. */
  const removeContext = useCallback(
    async (id: string) => {
      setContexts((prev) => prev.filter((c) => c.id !== id));
      setCurrent((prev) => (prev.contextId === id ? { ...prev, contextId: null } : prev));
      await supabase.from("contexts").delete().eq("id", id).eq("is_default", false);
    },
    [supabase]
  );

  const setNotifyOnChange = useCallback(
    async (notify: boolean) => {
      setCurrent((prev) => ({ ...prev, notifyOnChange: notify }));
      await supabase.from("user_context").upsert({ user_id: userId, notify_on_change: notify }, { onConflict: "user_id" });
    },
    [supabase, userId]
  );

  return {
    contexts,
    current,
    addContext,
    renameContext,
    setDefaultContext,
    setContextColor,
    setSleepContext,
    removeContext,
    setNotifyOnChange,
  };
}
