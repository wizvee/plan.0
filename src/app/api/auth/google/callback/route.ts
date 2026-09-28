import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createAuthFlowClient } from "@/lib/google-drive";
import { saveGoogleRefreshToken } from "@/lib/google-account";

/** Google 동의 화면에서 돌아오는 곳 — 코드를 토큰으로 교환해서 저장한다. */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const code = request.nextUrl.searchParams.get("code");
  const next = safeNextPath(request.nextUrl.searchParams.get("state"));
  if (!code) {
    return NextResponse.redirect(new URL(`${next}?google=error`, request.nextUrl.origin));
  }

  const redirectUri = new URL("/api/auth/google/callback", request.nextUrl.origin).toString();
  const client = createAuthFlowClient(redirectUri);

  try {
    const { tokens } = await client.getToken(code);
    if (!tokens.refresh_token) {
      // prompt=consent를 안 붙였거나 Google이 어떤 이유로든 refresh token을 안 준 경우.
      return NextResponse.redirect(new URL(`${next}?google=no_refresh_token`, request.nextUrl.origin));
    }
    await saveGoogleRefreshToken(supabase, user.id, tokens.refresh_token);
  } catch {
    return NextResponse.redirect(new URL(`${next}?google=error`, request.nextUrl.origin));
  }

  return NextResponse.redirect(new URL(`${next}?google=connected`, request.nextUrl.origin));
}

/**
 * 연결 후 돌아갈 경로. 앱 안의 경로("/...")만 허용한다 — `state`는 URL로 조작할 수 있어서, 그대로 쓰면
 * "https://다른사이트"나 "//다른사이트"로 튕겨 보내는 오픈 리다이렉트가 된다.
 */
function safeNextPath(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return "/para";
  return next;
}
