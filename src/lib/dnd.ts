import { pointerWithin, type CollisionDetection } from "@dnd-kit/core";

import { BACKLOG } from "@/lib/types";

/**
 * 할 일 보관함 패널(AppSidebar)은 그 자체로 BACKLOG 드롭 영역을 갖고 있어서, 화면에 다른 드롭
 * 대상(캘린더 칸, PARA 컨테이너 등)과 겹치면 pointerWithin이 더 넓은/먼저 등록된 BACKLOG를
 * 집어버려 실제 대상으로 드롭이 안 되는 경우가 있었다. 겹칠 때는 BACKLOG가 아닌 쪽을 우선한다.
 */
export const preferSpecificTargetCollision: CollisionDetection = (args) => {
  const collisions = pointerWithin(args);
  const specific = collisions.filter((c) => c.id !== BACKLOG);
  return specific.length > 0 ? specific : collisions;
};
