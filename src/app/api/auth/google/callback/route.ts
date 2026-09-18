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
  const next = request.nextUrl.searchParams.get("state") || "/para";
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
