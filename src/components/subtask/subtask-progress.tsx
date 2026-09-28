import type { SubtaskProgress as Progress } from "@/lib/types";

const RADIUS = 5.5;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * 하위 할 일 진행률 — 작은 원형 링 + "2/4". 하위가 없으면 아무것도 그리지 않는다.
 * `color`는 할 일의 카테고리 색(CSS 값). 숫자는 작은 글씨라 대비를 위해 보조 텍스트 색으로.
 */
export function SubtaskProgress({ progress, color, size = 13 }: { progress: Progress; color: string; size?: number }) {
  if (progress.total === 0) return null;
  const filled = (progress.done / progress.total) * CIRCUMFERENCE;

  return (
    <span
      className="flex shrink-0 items-center gap-1 font-semibold tabular-nums text-muted-foreground"
      aria-label={`하위 할 일 ${progress.total}개 중 ${progress.done}개 완료`}
    >
      <svg width={size} height={size} viewBox="0 0 14 14" aria-hidden="true">
        <circle
          cx="7"
          cy="7"
          r={RADIUS}
          fill="none"
          strokeWidth="2"
          style={{ stroke: `color-mix(in srgb, ${color} 20%, transparent)` }}
        />
        {filled > 0 ? (
          <circle
            cx="7"
            cy="7"
            r={RADIUS}
            fill="none"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray={`${filled} ${CIRCUMFERENCE}`}
            transform="rotate(-90 7 7)"
            style={{ stroke: color }}
          />
        ) : null}
      </svg>
      <span aria-hidden="true">
        {progress.done}/{progress.total}
      </span>
    </span>
  );
}
