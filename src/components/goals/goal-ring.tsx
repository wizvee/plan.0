import type { ReactNode } from "react";

/**
 * 주간 목표 진행률 링 — 레일 · 목표 카드 · 모바일 탭이 같이 쓴다 (GOALS-PLAN.md).
 * `ratio`가 null이면(목표 없음 · 연결된 할 일 없음) 점선 링. 가운데에는 `children`(아이콘이나 "2/4")을 둔다.
 * `color`는 CSS 값 — 목표 카드는 PARA 카테고리 색, 레일은 primary.
 */
export function GoalRing({
  ratio,
  size,
  strokeWidth,
  color,
  children,
}: {
  ratio: number | null;
  size: number;
  strokeWidth: number;
  color: string;
  children?: ReactNode;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;
  const filled = ratio === null ? 0 : Math.min(1, Math.max(0, ratio)) * circumference;

  return (
    <span className="relative flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="absolute inset-0" aria-hidden="true">
        {ratio === null ? (
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            strokeWidth={Math.max(1.5, strokeWidth - 1)}
            strokeDasharray="3 3"
            className="stroke-black/20"
          />
        ) : (
          <>
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              strokeWidth={strokeWidth}
              style={{ stroke: `color-mix(in srgb, ${color} 20%, transparent)` }}
            />
            {filled > 0 ? (
              <circle
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={`${filled} ${circumference}`}
                transform={`rotate(-90 ${center} ${center})`}
                style={{ stroke: color }}
              />
            ) : null}
          </>
        )}
      </svg>
      <span className="relative flex items-center justify-center">{children}</span>
    </span>
  );
}
