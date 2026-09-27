"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, CheckCircle2, X } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * "Google Drive 연결/재연결"이 `/api/auth/google/callback`을 거쳐 돌아올 때 붙는 `?google=` 결과 표시.
 * 셸에 있으므로 어느 화면에서 연결을 시작했든 그 화면에서 보인다(예전엔 PARA 목록에서만 보였음).
 * 결과 값은 처음 한 번만 읽고, 주소창에서 `google` 쿼리만 지운다(다른 쿼리는 유지).
 */
export function DriveStatusBanner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<string | null>(() => searchParams.get("google"));

  useEffect(() => {
    if (!searchParams.get("google")) return;
    const rest = new URLSearchParams(searchParams.toString());
    rest.delete("google");
    const query = rest.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [searchParams, router, pathname]);

  if (!status) return null;

  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 pt-6 sm:px-6">
      <div
        className={cn(
          "flex items-center gap-2 rounded-md px-3.5 py-2.5 text-[13px] font-bold",
          status === "connected" ? "bg-accent text-accent-foreground" : "bg-destructive/10 text-destructive"
        )}
      >
        {status === "connected" ? (
          <CheckCircle2 className="size-4 shrink-0" />
        ) : (
          <AlertCircle className="size-4 shrink-0" />
        )}
        <span className="flex-1">
          {status === "connected"
            ? "Google Drive가 연결됐습니다."
            : status === "no_refresh_token"
              ? "Google에서 접근 권한(refresh token)을 받지 못했습니다. 사이드바에서 다시 연결해주세요."
              : "Google Drive 연결에 실패했습니다. 사이드바에서 다시 시도해주세요."}
        </span>
        <button type="button" onClick={() => setStatus(null)} aria-label="닫기" className="shrink-0">
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
