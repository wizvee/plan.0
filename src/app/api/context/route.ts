import { NextResponse, type NextRequest } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { bearerMatches } from "@/lib/secret-header";
import { pushBadgeFor, pushConfigured, sendToUser } from "@/lib/push-server";

/**
 * 현재 컨텍스트 바꾸기 — iOS 단축어 자동화(집중 모드 켜짐 / 꺼짐)가 부른다. WEBAPP-PLAN.md 5단계.
 *
 *   POST /api/context
 *   Authorization: Bearer <CONTEXT_API_SECRET>
 *   { "context": "work" }      ← 컨텍스트 키 (앱의 컨텍스트 관리에 보이는 값)
 *   { "context": "default" }   ← 기본 컨텍스트로 (집중 모드 꺼질 때)
 *
 * 로그인 세션 없이 호출되므로 `/api/clip`과 같은 방식(비밀 키 + 단일 사용자 `CLIP_USER_ID`)으로 인증하고,
 * secret 키 클라이언트로 `user_context`를 갱신한다. 열린 앱은 Realtime으로 바로 반영된다.
 * 실제로 바뀌었고 "컨텍스트 바뀔 때 알림"(Q1, `user_context.notify_on_change`)이 켜져 있으면
 * "지금 회사 · 안 한 일 3개" 푸시를 보낸다 — iOS는 알림 없이 배지만 바꿀 수 없어서 배지를 바로 맞추는 용도. (6단계)
 */

export async function POST(request: NextRequest) {
  const secret = process.env.CONTEXT_API_SECRET;
  const userId = process.env.CLIP_USER_ID;
  if (!secret || !userId || !process.env.SUPABASE_SECRET_KEY) {
    return NextResponse.json(
      { error: "서버에 CONTEXT_API_SECRET / CLIP_USER_ID / SUPABASE_SECRET_KEY가 설정되지 않았습니다." },
      { status: 500 }
    );
  }
  if (!bearerMatches(request.headers.get("authorization"), secret)) {
    return NextResponse.json({ error: "인증 실패" }, { status: 401 });
  }

  let body: { context?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON 본문이 필요합니다. 예: {"context": "work"}' }, { status: 400 });
  }

  const requested = typeof body.context === "string" ? body.context.trim().toLowerCase() : "";
  if (!requested) {
    return NextResponse.json({ error: 'context 값이 필요합니다. 예: {"context": "work"} 또는 {"context": "default"}' }, { status: 400 });
  }

  const supabase = createAdminClient();
  const query = supabase.from("contexts").select("id, name, key").eq("user_id", userId);
  const { data: context, error: lookupError } = await (requested === "default"
    ? query.eq("is_default", true)
    : query.eq("key", requested)
  ).maybeSingle();

  if (lookupError) {
    return NextResponse.json({ error: "컨텍스트를 읽지 못했습니다." }, { status: 500 });
  }
  if (!context) {
    // 단축어에 오타가 있으면 조용히 넘어가지 않고 알려준다
    const { data: all } = await supabase.from("contexts").select("key").eq("user_id", userId);
    const keys = (all ?? []).map((c) => c.key).join(", ");
    return NextResponse.json({ error: `"${requested}" 컨텍스트가 없습니다. 사용 가능: ${keys}, default` }, { status: 400 });
  }

  const { data: previous } = await supabase
    .from("user_context")
    .select("context_id, notify_on_change")
    .eq("user_id", userId)
    .maybeSingle();

  const now = new Date();
  const { error: updateError } = await supabase
    .from("user_context")
    .upsert({ user_id: userId, context_id: context.id, changed_at: now.toISOString() }, { onConflict: "user_id" });
  if (updateError) {
    return NextResponse.json({ error: "컨텍스트를 바꾸지 못했습니다." }, { status: 500 });
  }

  const changed = previous?.context_id !== context.id;
  const notifyOnChange = previous?.notify_on_change ?? true;
  let notified = false;
  if (changed && notifyOnChange && pushConfigured()) {
    // 알림이 실패해도 컨텍스트 전환 자체는 성공 — 단축어에는 성공으로 돌려준다
    try {
      const badge = await pushBadgeFor(supabase, userId, now, context.id);
      const result = await sendToUser(
        supabase,
        userId,
        {
          title: `지금 ${context.name}`,
          body: badge > 0 ? `안 한 일 ${badge}개` : "안 한 일이 없어요",
          badge,
          tag: "context",
          url: "/",
        },
        request.nextUrl.origin
      );
      notified = result.sent > 0;
    } catch (err) {
      console.error("[context] notify failed", err);
    }
  }

  return NextResponse.json({ ok: true, context: { key: context.key, name: context.name }, changed, notified });
}
