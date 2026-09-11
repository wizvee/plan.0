"use client";

import { useEffect, useState } from "react";

import { toDateKey } from "@/lib/week";

/**
 * 오늘 날짜(yyyy-MM-dd)를 클라이언트에서만 계산한다. 서버(SSR)는 UTC로 렌더링될 수
 * 있어서, 렌더링 시점에 바로 `new Date()`를 쓰면 자정 근처(대략 00~09시 KST)에
 * "오늘" 표시가 하루 어긋날 수 있다. 마운트 전에는 null을 반환해서 잘못된 값이
 * 잠깐이라도 그려지지 않게 한다.
 */
export function useTodayKey(): string | null {
  const [key, setKey] = useState<string | null>(null);

  useEffect(() => {
    function update() {
      setKey(toDateKey(new Date()));
    }
    const immediate = setTimeout(update, 0);
    const id = setInterval(update, 60_000);
    return () => {
      clearTimeout(immediate);
      clearInterval(id);
    };
  }, []);

  return key;
}
