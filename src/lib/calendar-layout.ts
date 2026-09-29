import { BLOCK_GAP, DEFAULT_DURATION_MINUTES, DEFAULT_START_MINUTES, MIN_BLOCK_HEIGHT, minutesToPx } from "@/lib/time";
import type { Todo } from "@/lib/types";

/**
 * 주 보기에서 겹치는 블록 배치 — 애플 캘린더 방식 (2026-09-29 시안 ④, https://claude.ai/artifact/1xV98C9TMFtRfJDWKgGJcg).
 * 1. 화면에서 안 겹치면 칸 전체 너비 (딱 붙은 7:00–7:30 · 7:30~ 도 안 겹침)
 * 2. 겹쳐도 아래 블록의 제목 · 시간 줄을 지나서 시작하면 → 안쪽에 쏙 얹기 (왼쪽 9px · 오른쪽 7px 안)
 * 3. 그 안에서 시작하면(같은 시각 포함) → 나란히 같은 너비로 나누기 (둘이면 50:50)
 */

/** 블록 머리(위 여백 5 + 제목 줄 15 + 간격 2 + 시간 줄 14) — 이 안에서 시작하면 제목이 가려지므로 나란히 둔다 */
const TITLE_ZONE_PX = 36;
/** 안쪽에 얹을 때 — 아래 블록의 왼쪽 색 막대만 보이게 9px, 오른쪽은 7px 안으로 */
const NEST_LEFT_PX = 9;
const NEST_RIGHT_PX = 7;
/** 나란히 둘 때 블록 사이 */
const COLUMN_GAP_PX = 2;
/** 칸 가장자리 여백 — 왼쪽 3px · 오른쪽 4px */
const BASE_LEFT_PX = 3;
const BASE_RIGHT_PX = 4;

/** 블록이 화면에 그려지는 높이 — 짧아도 최소 높이, 아래는 다음 블록과 BLOCK_GAP만큼 띄운다 */
export function blockHeightPx(durationMinutes: number): number {
  return Math.max(minutesToPx(durationMinutes), MIN_BLOCK_HEIGHT) - BLOCK_GAP;
}

export interface PlacedBlock {
  todo: Todo;
  /** CSS `left` · `width` (칸 기준 calc 식) */
  left: string;
  width: string;
  /** 다른 블록 안쪽에 얹혔는지 — 흰 테두리 + 살짝 어두운 틴트 */
  nested: boolean;
}

interface Item {
  todo: Todo;
  top: number;
  bottom: number;
  group: Group;
  box: { left: string; width: string };
}

/** 나란히 놓이는 블록들. `parent`가 있으면 그 블록 안쪽 영역을 나눠 쓴다. */
interface Group {
  parent: Item | null;
  members: Item[];
}

/**
 * 하루 칸의 블록들을 그릴 순서와 위치로 바꾼다.
 * 반환 순서대로 그리면 안쪽에 얹힌 블록이 항상 자기가 덮는 블록보다 뒤(위)에 온다.
 */
export function layoutDayBlocks(todos: Todo[]): PlacedBlock[] {
  const items = todos.map((todo) => {
    const top = minutesToPx(todo.startMinutes ?? DEFAULT_START_MINUTES);
    return { todo, top, bottom: top + blockHeightPx(todo.durationMinutes ?? DEFAULT_DURATION_MINUTES) } as Item;
  });
  // 이른 것 먼저, 같은 시각이면 긴 것 먼저 — 긴 블록(업무)이 바닥에 깔린다
  items.sort((a, b) => a.top - b.top || b.bottom - a.bottom);

  const placed: Item[] = [];
  for (const item of items) {
    // 겹침은 그려진 높이로 판단한다(시간이 아니라) — 최소 높이 때문에 실제로 겹쳐 보이는 짧은 블록도 겹침
    const overlaps = placed.filter((p) => p.top < item.bottom && item.top < p.bottom);
    if (overlaps.length === 0) {
      item.group = { parent: null, members: [item] };
    } else {
      // 가장 늦게 시작한 블록 기준 — 그 블록의 머리 안에서 시작하면 나란히, 지났으면 그 안쪽에
      const latest = overlaps.reduce((a, b) => (b.top >= a.top ? b : a));
      if (item.top - latest.top < TITLE_ZONE_PX) {
        latest.group.members.push(item);
        item.group = latest.group;
      } else {
        item.group = { parent: latest, members: [item] };
      }
    }
    placed.push(item);
  }

  // 위치는 그룹이 다 정해진 뒤에 — 나중에 합류한 블록 때문에 앞 블록의 너비도 바뀐다. 부모가 항상 먼저 온다.
  for (const item of items) {
    const { parent, members } = item.group;
    const span = parent
      ? {
          left: `(${parent.box.left} + ${NEST_LEFT_PX}px)`,
          width: `(${parent.box.width} - ${NEST_LEFT_PX + NEST_RIGHT_PX}px)`,
        }
      : { left: `${BASE_LEFT_PX}px`, width: `(100% - ${BASE_LEFT_PX + BASE_RIGHT_PX}px)` };
    const n = members.length;
    const i = members.indexOf(item);
    item.box =
      n === 1
        ? span
        : {
            left: `(${span.left} + ${span.width} * ${i} / ${n})`,
            width: `(${span.width} / ${n}${i < n - 1 ? ` - ${COLUMN_GAP_PX}px` : ""})`,
          };
  }

  return items.map((item) => ({
    todo: item.todo,
    left: `calc(${item.box.left})`,
    width: `calc(${item.box.width})`,
    nested: item.group.parent !== null,
  }));
}
