import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createAuthFlowClient } from "@/lib/google-drive";

/** "Google Drive 연결" 버튼이 여는 곳 — Google 동의 화면으로 리다이렉트한다. */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const next = request.nextUrl.searchParams.get("next") ?? "/para";
  const redirectUri = new URL("/api/auth/google/callback", request.nextUrl.origin).toString();
  const client = createAuthFlowClient(redirectUri);

  const authUrl = client.generateAuthUrl({
    access_type: "offline",
    // 이미 한 번 연결한 계정이어도 매번 refresh token을 다시 받기 위함(재연결 시나리오 대비).
    prompt: "consent",
    scope: ["https://www.googleapis.com/auth/drive.file"],
    state: next,
  });

  return NextResponse.redirect(authUrl);
}
