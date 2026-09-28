import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";

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
 * "컨텍스트 바뀔 때 알림"(배지 즉시 반영)은 발송 서버가 생기는 6단계에서 여기에 붙인다.
 */

function secretMatches(header: string | null, secret: string) {
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(header ?? "");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function POST(request: NextRequest) {
  const secret = process.env.CONTEXT_API_SECRET;
  const userId = process.env.CLIP_USER_ID;
  if (!secret || !userId || !process.env.SUPABASE_SECRET_KEY) {
    return NextResponse.json(
      { error: "서버에 CONTEXT_API_SECRET / CLIP_USER_ID / SUPABASE_SECRET_KEY가 설정되지 않았습니다." },
      { status: 500 }
    );
  }
  if (!secretMatches(request.headers.get("authorization"), secret)) {
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

  const { error: updateError } = await supabase
    .from("user_context")
    .upsert({ user_id: userId, context_id: context.id, changed_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (updateError) {
    return NextResponse.json({ error: "컨텍스트를 바꾸지 못했습니다." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, context: { key: context.key, name: context.name } });
}
