import { closestCenter, pointerWithin, type CollisionDetection } from "@dnd-kit/core";

import { BACKLOG } from "@/lib/types";
import type { ActiveData, OverData } from "@/lib/dnd/drop-targets";

/**
 * 할 일 보관함 패널(AppSidebar)은 그 자체로 BACKLOG 드롭 영역을 갖고 있어서, 화면에 다른 드롭
 * 대상(캘린더 칸, PARA 컨테이너 등)과 겹치면 pointerWithin이 더 넓은/먼저 등록된 BACKLOG를
 * 집어버려 실제 대상으로 드롭이 안 되는 경우가 있었다. 겹칠 때는 BACKLOG가 아닌 쪽을 우선한다.
 *
 * 하위 할 일은 따로 논다: 하위 할 일을 끌 때는 **같은 할 일의 하위 행만** 대상으로(closestCenter —
 * 목록 정렬용), 할 일을 끌 때는 하위 행을 대상에서 뺀다(펼친 PARA 목록 위에 놓아도 카드로 판정되게).
 */
export const preferSpecificTargetCollision: CollisionDetection = (args) => {
  const active = args.active.data.current as ActiveData | undefined;
  const overDataOf = (id: string | number) =>
    args.droppableContainers.find((c) => c.id === id)?.data.current as OverData | undefined;

  if (active?.type === "subtask") {
    const siblings = args.droppableContainers.filter((c) => {
      const data = c.data.current as OverData | undefined;
      return data?.type === "subtask" && data.todoId === active.todoId;
    });
    return closestCenter({ ...args, droppableContainers: siblings });
  }

  const collisions = pointerWithin(args).filter((c) => overDataOf(c.id)?.type !== "subtask");
  const specific = collisions.filter((c) => c.id !== BACKLOG);
  return specific.length > 0 ? specific : collisions;
};
