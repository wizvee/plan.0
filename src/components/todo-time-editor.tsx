"use client";

import { MINUTES_PER_DAY, durationBetween, formatDuration, isOvernight, parseTimeInputValue, snapMinutes, toTimeInputValue } from "@/lib/time";

/**
 * 상세 팝업의 시작 · 끝 편집 (BALANCE-PLAN.md 6번, 시안 ④). 15분 단위, 모바일은 iOS 기본 시간 휠.
 * 시작을 바꾸면 길이는 그대로(끝이 따라 움직임 — 애플 캘린더 방식), 끝을 바꾸면 길이가 바뀐다.
 * 끝이 시작보다 이르거나 같으면 다음 날 — 자정을 넘는 블록은 여기서 만든다.
 */
export function TodoTimeEditor({
  startMinutes,
  durationMinutes,
  onChange,
}: {
  startMinutes: number;
  durationMinutes: number;
  onChange: (startMinutes: number, durationMinutes: number) => void;
}) {
  const end = (startMinutes + durationMinutes) % MINUTES_PER_DAY;
  const overnight = isOvernight(startMinutes, durationMinutes);

  function read(value: string): number | null {
    const minutes = parseTimeInputValue(value);
    return minutes === null ? null : snapMinutes(minutes) % MINUTES_PER_DAY;
  }

  return (
    <div className="mt-2 overflow-hidden rounded-xl bg-secondary">
      <label className="flex h-11 items-center gap-2.5 px-3">
        <span className="flex-1 text-[14px]">시작</span>
        <input
          type="time"
          step={900}
          value={toTimeInputValue(startMinutes)}
          onChange={(e) => {
            const next = read(e.target.value);
            if (next !== null && next !== startMinutes) onChange(next, durationMinutes);
          }}
          className="h-8 rounded-[7px] bg-black/[0.06] px-2.5 text-[15px] font-semibold tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-primary"
        />
      </label>
      <label className="flex h-11 items-center gap-2 border-t border-border px-3">
        <span className="flex-1 text-[14px]">끝</span>
        {overnight ? (
          <span className="flex h-[22px] items-center rounded-[5px] bg-black/[0.08] px-2 text-[11.5px] font-semibold text-muted-foreground">
            다음 날
          </span>
        ) : null}
        <input
          type="time"
          step={900}
          value={toTimeInputValue(end)}
          onChange={(e) => {
            const next = read(e.target.value);
            if (next === null) return;
            const duration = durationBetween(startMinutes, next);
            if (duration !== durationMinutes) onChange(startMinutes, duration);
          }}
          className="h-8 rounded-[7px] bg-black/[0.06] px-2.5 text-[15px] font-semibold tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-primary"
        />
      </label>
      <p className="flex h-[34px] items-center gap-2 border-t border-border px-3 text-[12.5px] text-muted-foreground">
        <span className="flex-1">15분 단위 · 끝이 시작보다 이르면 다음 날</span>
        <span className="font-semibold tabular-nums">{formatDuration(durationMinutes)}</span>
      </p>
    </div>
  );
}
