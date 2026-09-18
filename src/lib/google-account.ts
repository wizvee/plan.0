import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";

/** google_accounts에 저장된 이 사용자의 refresh token. 연결 전이면 null. */
export async function getGoogleRefreshToken(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("google_accounts")
    .select("refresh_token")
    .eq("user_id", userId)
    .maybeSingle();
  return data?.refresh_token ?? null;
}

/** 사이드바 등에서 "연결됨" 표시용 — 저장된 토큰이 있는지만 확인(실제 유효성은 검사 안 함). */
export async function isGoogleConnected(supabase: SupabaseClient, userId: string): Promise<boolean> {
  return (await getGoogleRefreshToken(supabase, userId)) !== null;
}

export async function saveGoogleRefreshToken(
  supabase: SupabaseClient,
  userId: string,
  refreshToken: string
): Promise<void> {
  await supabase
    .from("google_accounts")
    .upsert({ user_id: userId, refresh_token: refreshToken, updated_at: new Date().toISOString() });
}

/** "테스트" 상태 동의 화면에서 7일 만에 만료되는 등, 저장된 토큰이 더 이상 안 먹힐 때 지운다 —
 * 지우고 나면 사이드바가 다시 "연결" 상태로 보여서 재연결을 자연스럽게 유도한다. */
export async function clearGoogleRefreshToken(supabase: SupabaseClient, userId: string): Promise<void> {
  await supabase.from("google_accounts").delete().eq("user_id", userId);
}

export type GoogleAuth =
  | { ok: true; refreshToken: string; supabase: SupabaseClient; userId: string }
  | { ok: false; error: NextResponse };

/** API route에서 공통으로 쓰는 가드: 로그인 + Google Drive 연결 여부를 한 번에 확인한다. */
export async function requireGoogleAuth(): Promise<GoogleAuth> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 }) };

  const refreshToken = await getGoogleRefreshToken(supabase, user.id);
  if (!refreshToken) {
    return { ok: false, error: NextResponse.json({ error: "Google Drive 계정을 먼저 연결해주세요." }, { status: 409 }) };
  }
  return { ok: true, refreshToken, supabase, userId: user.id };
}

/** Google API 호출에서 refresh token이 더 이상 유효하지 않을 때 나는 에러인지 확인한다. */
export function isInvalidGrantError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return message.includes("invalid_grant");
}

/** /api/drive/* 라우트의 catch 블록 공용 처리: 만료된 토큰이면 지우고 재연결을 안내한다. */
export async function handleGoogleApiError(
  auth: Extract<GoogleAuth, { ok: true }>,
  err: unknown
): Promise<NextResponse> {
  if (isInvalidGrantError(err)) {
    await clearGoogleRefreshToken(auth.supabase, auth.userId);
    return NextResponse.json(
      { error: "Google Drive 연결이 만료됐습니다. 사이드바에서 다시 연결해주세요." },
      { status: 409 }
    );
  }
  return NextResponse.json(
    { error: err instanceof Error ? err.message : "Google Drive 요청에 실패했습니다." },
    { status: 500 }
  );
}
