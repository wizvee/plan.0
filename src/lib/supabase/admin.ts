import { createClient } from "@supabase/supabase-js";

/**
 * secret 키(옛 service_role)로 RLS를 우회하는 서버 전용 클라이언트.
 * /api/clip 같은, 로그인 세션 없이 호출되는 라우트에서만 쓴다.
 * 절대 클라이언트 컴포넌트나 NEXT_PUBLIC_* 값으로 노출하면 안 됨.
 */
export function createAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
