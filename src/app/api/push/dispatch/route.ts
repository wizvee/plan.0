import { NextResponse, type NextRequest } from "next/server";

import { PUSH_LEAD_MINUTES, countBadge, seoulInstant, seoulMoment, startMinutesOf } from "@/lib/badge";
import { createAdminClient } from "@/lib/supabase/admin";
import { bearerMatches } from "@/lib/secret-header";
import { loadBadgeState, mondayKeyOf, plainText, pushBadgeMoment, pushConfigured, sendToUser } from "@/lib/push-server";
import { formatClock } from "@/lib/time";

/**
 * 할 일 시작 10분 전 푸시 — Supabase `pg_cron`이 1분마다 부른다(`supabase/migrations/20260928_push_cron.sql`).
 * WEBAPP-PLAN.md 6단계.
 *
 *   POST /api/push/dispatch
 *   Authorization: Bearer <PUSH_DISPATCH_SECRET>
 *
 * 구독(기기)이 있는 사용자마다:
 *   1. 현재 컨텍스트 + 오늘(자정 직전이면 내일까지)의 미완료 할 일 읽기
 *   2. 현재 컨텍스트에 속하고 "시작 − 10분"이 지난 지 5분 안인 할 일 = 보낼 것 (cron이 한두 번 밀려도 놓치지 않게)
 *   3. `push_log`에 먼저 기록 — 이미 있으면(보냈으면) 건너뜀. 모든 기기에 실패하면 기록을 지워 다음 분에 다시 시도
 *   4. 배지 = 지금 + 10분 기준 안 한 일 (방금 알린 할 일 포함)
 */

/** "시작 − 10분"이 지난 뒤 이 시간 안이면 늦게라도 보낸다 */
const CATCH_UP_MINUTES = 5;
/** 이보다 오래된 발송 기록은 지운다 */
const LOG_RETENTION_DAYS = 30;

export async function POST(request: NextRequest) {
  const secret = process.env.PUSH_DISPATCH_SECRET;
  if (!secret || !process.env.SUPABASE_SECRET_KEY || !pushConfigured()) {
    return NextResponse.json(
      { error: "서버에 PUSH_DISPATCH_SECRET / SUPABASE_SECRET_KEY / VAPID 키가 설정되지 않았습니다." },
      { status: 500 }
    );
  }
  if (!bearerMatches(request.headers.get("authorization"), secret)) {
    return NextResponse.json({ error: "인증 실패" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = new Date();
  const today = seoulMoment(now);
  const badgeAt = pushBadgeMoment(now);
  const dateKeys = [...new Set([today.dateKey, badgeAt.dateKey])];

  const { data: subscribers, error } = await supabase.from("push_subscriptions").select("user_id");
  if (error) {
    return NextResponse.json({ error: "구독 목록을 읽지 못했습니다." }, { status: 500 });
  }
  const userIds = [...new Set((subscribers ?? []).map((s) => s.user_id as string))];

  let sent = 0;
  const failures: string[] = [];

  for (const userId of userIds) {
    try {
      sent += await dispatchForUser(userId);
    } catch (err) {
      console.error("[dispatch] user failed", userId, err);
      failures.push(userId);
    }
  }

  // 오래된 기록 정리 (실패해도 발송과 무관)
  await supabase
    .from("push_log")
    .delete()
    .lt("sent_at", new Date(now.getTime() - LOG_RETENTION_DAYS * 86_400_000).toISOString());

  return NextResponse.json({ ok: failures.length === 0, users: userIds.length, sent, failed: failures.length });

  async function dispatchForUser(userId: string): Promise<number> {
    const state = await loadBadgeState(supabase, userId, dateKeys);

    const due = state.todos
      .filter((todo) => !state.currentContextId || todo.contextId === state.currentContextId)
      .map((todo) => ({ todo, startAt: seoulInstant(todo.scheduledDate, startMinutesOf(todo)) }))
      .filter(({ startAt }) => {
        const sinceFire = now.getTime() - (startAt.getTime() - PUSH_LEAD_MINUTES * 60_000);
        return sinceFire >= 0 && sinceFire < CATCH_UP_MINUTES * 60_000;
      });
    if (due.length === 0) return 0;

    // 먼저 기록해서 동시에 두 번 불려도 한 번만 보낸다 — 새로 들어간 행만 돌려받음
    const { data: claimed, error: claimError } = await supabase
      .from("push_log")
      .upsert(
        due.map(({ todo, startAt }) => ({
          user_id: userId,
          todo_id: todo.id,
          kind: "todo-start",
          scheduled_for: startAt.toISOString(),
        })),
        { onConflict: "todo_id,kind,scheduled_for", ignoreDuplicates: true }
      )
      .select("id, todo_id");
    if (claimError) throw claimError;
    if (!claimed || claimed.length === 0) return 0;

    const badge = countBadge(state.todos, state.currentContextId, badgeAt);
    let count = 0;

    for (const { id: logId, todo_id: todoId } of claimed) {
      const item = due.find(({ todo }) => todo.id === todoId);
      if (!item) continue;
      const start = startMinutesOf(item.todo);
      const minutesLeft = Math.max(1, Math.round((item.startAt.getTime() - now.getTime()) / 60_000));
      const result = await sendToUser(
        supabase,
        userId,
        {
          title: plainText(item.todo.content),
          body: `${minutesLeft}분 뒤 · ${formatClock(start)}`,
          url: `/?week=${mondayKeyOf(item.todo.scheduledDate)}`,
          badge,
          tag: `todo-${item.todo.id}`,
        },
        request.nextUrl.origin
      );
      if (result.sent > 0) count += 1;
      else if (result.devices > result.removed) {
        // 살아있는 기기가 있는데 전부 실패 — 기록을 지워 다음 분(따라잡기 시간 안)에 다시 시도
        await supabase.from("push_log").delete().eq("id", logId);
      }
    }
    return count;
  }
}
