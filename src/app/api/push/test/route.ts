import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { pushBadgeFor, pushConfigured, sendToUser } from "@/lib/push-server";

/**
 * 계정 메뉴 "테스트" — 로그인한 사용자의 모든 기기로 **서버에서** 실제 푸시를 보낸다(VAPID 키 · 구독 · 서비스 워커 ·
 * 배지까지 한 번에 확인). 세션 쿠키로 인증하고 RLS 안에서만 읽고 쓴다. WEBAPP-PLAN.md 6단계.
 */
export async function POST(request: NextRequest) {
  if (!pushConfigured()) {
    return NextResponse.json({ error: "서버에 VAPID 키가 설정되지 않았어요." }, { status: 500 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  try {
    const badge = await pushBadgeFor(supabase, user.id, new Date());
    const result = await sendToUser(
      supabase,
      user.id,
      {
        title: "plan.0 테스트 알림",
        body: badge > 0 ? `서버에서 보냈어요 · 안 한 일 ${badge}개` : "서버에서 보냈어요 · 안 한 일이 없어요",
        badge,
        tag: "test",
        url: "/",
      },
      request.nextUrl.origin
    );
    if (result.sent === 0) {
      return NextResponse.json({ error: "보낼 수 있는 기기가 없어요. 알림을 껐다가 다시 켜 주세요.", ...result }, { status: 502 });
    }
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[push/test] failed", err);
    return NextResponse.json({ error: "알림을 보내지 못했어요." }, { status: 500 });
  }
}
