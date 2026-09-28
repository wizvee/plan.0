import webpush, { WebPushError } from "web-push";
import type { SupabaseClient } from "@supabase/supabase-js";

import { PUSH_LEAD_MINUTES, countBadge, resolveContextId, seoulMoment, type BadgeTodo, type LocalMoment } from "@/lib/badge";

/**
 * 서버 전용 웹 푸시 도우미 (WEBAPP-PLAN.md 6단계) — `/api/push/dispatch` · `/api/push/test` · `/api/context`가 쓴다.
 * 넘겨받는 Supabase 클라이언트는 secret 키(RLS 우회)일 수도 있으므로 **모든 쿼리에 user_id를 직접 건다.**
 */

/** 서비스 워커(`public/sw.js`)가 받는 페이로드 */
export interface PushPayload {
  title: string;
  body?: string;
  url?: string;
  badge?: number;
  tag?: string;
}

export function pushConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

/** VAPID subject는 연락처(mailto: 또는 https URL). 따로 안 정하면 앱 주소를 쓴다. */
function configure(origin: string) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || origin,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
}

export interface SendResult {
  /** 이 사용자의 구독(기기) 수 */
  devices: number;
  sent: number;
  /** 만료돼서(404/410) 지운 구독 수 */
  removed: number;
}

/** 사용자의 모든 기기로 보낸다. 만료된 구독은 지우고, 성공한 구독은 last_success_at을 갱신. */
export async function sendToUser(
  supabase: SupabaseClient,
  userId: string,
  payload: PushPayload,
  origin: string
): Promise<SendResult> {
  configure(origin);
  const { data: subscriptions, error } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", userId);
  if (error) throw error;

  const result: SendResult = { devices: subscriptions?.length ?? 0, sent: 0, removed: 0 };
  const body = JSON.stringify(payload);

  await Promise.all(
    (subscriptions ?? []).map(async (s) => {
      try {
        // TTL 10분 — 시작 10분 전 알림이 한참 늦게 도착하면 의미가 없다
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, body, {
          TTL: 600,
          urgency: "high",
        });
        result.sent += 1;
        await supabase
          .from("push_subscriptions")
          .update({ last_success_at: new Date().toISOString() })
          .eq("user_id", userId)
          .eq("endpoint", s.endpoint);
      } catch (err) {
        if (err instanceof WebPushError && (err.statusCode === 404 || err.statusCode === 410)) {
          // 앱을 지웠거나 권한을 끈 기기 — 다시 보내봐야 실패하므로 정리
          await supabase.from("push_subscriptions").delete().eq("user_id", userId).eq("endpoint", s.endpoint);
          result.removed += 1;
        } else {
          console.error("[push] send failed", err instanceof WebPushError ? err.statusCode : err);
        }
      }
    })
  );
  return result;
}

/** 배지 · 발송 계산에 쓰는 할 일 (알림 제목용 내용 포함) */
export interface PushTodo extends BadgeTodo {
  id: string;
  content: string;
  scheduledDate: string;
}

export interface BadgeState {
  /** 현재 컨텍스트 id — null이면 전부 */
  currentContextId: string | null;
  notifyOnChange: boolean;
  /** 주어진 날짜들의 미완료 할 일 (노트 제외) */
  todos: PushTodo[];
}

/** 현재 컨텍스트 + 주어진 날짜들의 미완료 할 일을 컨텍스트까지 풀어서 읽는다. */
export async function loadBadgeState(supabase: SupabaseClient, userId: string, dateKeys: string[]): Promise<BadgeState> {
  const [contexts, current, projects, areas, resources, todos] = await Promise.all([
    supabase.from("contexts").select("id, is_default").eq("user_id", userId),
    supabase.from("user_context").select("context_id, notify_on_change").eq("user_id", userId).maybeSingle(),
    supabase.from("projects").select("id, context_id").eq("user_id", userId),
    supabase.from("areas").select("id, context_id").eq("user_id", userId),
    supabase.from("resources").select("id, context_id").eq("user_id", userId),
    supabase
      .from("todos")
      .select("id, content, kind, completed, scheduled_date, start_minutes, project_id, area_id, resource_id")
      .eq("user_id", userId)
      .eq("kind", "task")
      .eq("completed", false)
      .in("scheduled_date", dateKeys),
  ]);
  const failed = [contexts, current, projects, areas, resources, todos].find((r) => r.error);
  if (failed?.error) throw failed.error;

  const knownIds = new Set((contexts.data ?? []).map((c) => c.id as string));
  const defaultId = ((contexts.data ?? []).find((c) => c.is_default)?.id as string | undefined) ?? null;
  const containerContext = new Map<string, string | null>();
  for (const row of [...(projects.data ?? []), ...(areas.data ?? []), ...(resources.data ?? [])]) {
    containerContext.set(row.id as string, (row.context_id as string | null) ?? null);
  }

  return {
    currentContextId: (current.data?.context_id as string | null | undefined) ?? null,
    notifyOnChange: (current.data?.notify_on_change as boolean | undefined) ?? true,
    todos: (todos.data ?? []).map((t) => {
      const mapped = (t.project_id ?? t.area_id ?? t.resource_id) as string | null;
      return {
        id: t.id,
        content: t.content,
        kind: t.kind,
        completed: t.completed,
        scheduledDate: t.scheduled_date,
        startMinutes: t.start_minutes,
        contextId: resolveContextId(mapped ? containerContext.get(mapped) : null, defaultId, knownIds),
      };
    }),
  };
}

/**
 * 푸시에 싣는 배지 기준 시각 = 지금 + 10분. 알림은 시작 10분 전에 오니, 곧 시작할(=이미 알린) 할 일을 미리 센다.
 * 모든 서버 푸시가 같은 기준을 써서 푸시끼리 숫자가 줄었다 늘었다 하지 않게.
 */
export function pushBadgeMoment(now: Date): LocalMoment {
  return seoulMoment(new Date(now.getTime() + PUSH_LEAD_MINUTES * 60_000));
}

export async function pushBadgeFor(supabase: SupabaseClient, userId: string, now: Date, contextId?: string | null) {
  const at = pushBadgeMoment(now);
  const state = await loadBadgeState(supabase, userId, [at.dateKey]);
  return countBadge(state.todos, contextId === undefined ? state.currentContextId : contextId, at);
}

/** 알림 제목에는 백틱을 빼고 보여준다 (앱에서는 인라인 코드로 그리는 표시) */
export function plainText(content: string) {
  return content.replace(/`/g, "").trim() || "할 일";
}

/** yyyy-MM-dd → 그 주 월요일 yyyy-MM-dd (알림을 누르면 여는 주 보기 `/?week=`) */
export function mondayKeyOf(dateKey: string) {
  const date = new Date(`${dateKey}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  return date.toISOString().slice(0, 10);
}
