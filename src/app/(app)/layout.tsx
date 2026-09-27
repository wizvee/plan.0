import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { isGoogleConnected } from "@/lib/google-account";
import { AppDataProvider } from "@/lib/app-data/app-data-provider";

/**
 * 로그인 후 화면 전체(캘린더 · PARA 목록 · PARA 상세)가 공유하는 레이아웃.
 * 레이아웃은 화면 이동 때 다시 렌더링되지 않으므로 사용자 조회와 데이터 구독이 여기서 한 번만 일어난다.
 * 로그인 여부는 매 요청마다 `src/proxy.ts`가 확인하고, 데이터 접근은 Supabase RLS가 막는다.
 */
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const googleConnected = await isGoogleConnected(supabase, user.id);

  return (
    <AppDataProvider userId={user.id} userEmail={user.email ?? ""} googleConnected={googleConnected}>
      {children}
    </AppDataProvider>
  );
}
