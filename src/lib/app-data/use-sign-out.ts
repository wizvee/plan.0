"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

/** 로그아웃 후 로그인 화면으로. 예전엔 세 화면에 같은 함수가 복붙돼 있었다. */
export function useSignOut() {
  const router = useRouter();
  return useCallback(async () => {
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }, [router]);
}
