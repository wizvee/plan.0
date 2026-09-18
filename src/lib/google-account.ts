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

export async function saveGoogleRefreshToken(
  supabase: SupabaseClient,
  userId: string,
  refreshToken: string
): Promise<void> {
  await supabase
    .from("google_accounts")
    .upsert({ user_id: userId, refresh_token: refreshToken, updated_at: new Date().toISOString() });
}

export type GoogleAuth = { ok: true; refreshToken: string } | { ok: false; error: NextResponse };

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
  return { ok: true, refreshToken };
}
