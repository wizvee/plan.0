"use client";

import { useMemo } from "react";

import { useAppData } from "@/lib/app-data/app-data-provider";
import { useContainers } from "@/lib/app-data/use-containers";
import { useTodos } from "@/lib/app-data/use-todos";
import { useSubtasks } from "@/lib/app-data/use-subtasks";
import type { ParaKind } from "@/lib/types";

export interface RemoveContainerOptions {
  /** true = 매핑된 할 일 · 노트도 지우고 Drive 폴더는 휴지통으로(기본). false = 연결만 끊고 Drive 폴더는 그대로 */
  withItems: boolean;
  /** Drive 휴지통 이동이 실패했을 때 "Drive 폴더는 두고 삭제"를 고르면 true */
  skipDrive?: boolean;
}

export type RemoveContainerResult =
  | { ok: true }
  /** `drive` = Drive 폴더를 휴지통에 못 넣음(아직 아무것도 안 지움) · `data` = 할 일/컨테이너 삭제 실패 */
  | { ok: false; step: "drive" | "data"; message: string };

/**
 * PARA 컨테이너(Project/Area/Resource) 삭제의 단일 구현 (PARA-MANAGE-PLAN.md 3번).
 * 순서가 중요하다: ① Drive 폴더 휴지통(DB를 먼저 지우면 폴더 id를 잃음) → ② 매핑된 할 일 삭제
 * (컨테이너를 먼저 지우면 FK가 매핑을 null로 바꿔 어떤 할 일이었는지 잃음) → ③ 컨테이너 삭제.
 * 앞 단계가 실패하면 뒤 단계는 하지 않는다.
 */
export function useContainerActions() {
  const { googleConnected } = useAppData();
  const { projects, areas, resources, removeProject, removeArea, removeResource } = useContainers();
  const { removeTodosMappedTo, clearMappingTo } = useTodos();
  const { dropSubtasksOfMany } = useSubtasks();

  return useMemo(
    () => ({
      async removeContainer(kind: ParaKind, id: string, options: RemoveContainerOptions): Promise<RemoveContainerResult> {
        const list = kind === "project" ? projects : kind === "area" ? areas : resources;
        const container = list.find((c) => c.id === id);
        if (!container) return { ok: true };

        if (options.withItems && !options.skipDrive && googleConnected && container.driveFolderId) {
          try {
            const res = await fetch("/api/drive/folder", {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ kind, containerId: id }),
            });
            if (!res.ok) {
              const data = await res.json().catch(() => ({}));
              return { ok: false, step: "drive", message: data.error ?? "Drive 폴더를 휴지통으로 옮기지 못했어요." };
            }
          } catch {
            return { ok: false, step: "drive", message: "Drive 폴더를 휴지통으로 옮기지 못했어요." };
          }
        }

        let removedTodoIds: string[] = [];
        if (options.withItems) {
          const ids = await removeTodosMappedTo(kind, id);
          if (ids === null) return { ok: false, step: "data", message: "연결된 할 일을 지우지 못했어요." };
          removedTodoIds = ids;
        }

        const removed =
          kind === "project" ? await removeProject(id) : kind === "area" ? await removeArea(id) : await removeResource(id);
        if (!removed) return { ok: false, step: "data", message: "삭제하지 못했어요. 잠시 후 다시 시도해 주세요." };

        if (!options.withItems) clearMappingTo(kind, id);
        dropSubtasksOfMany(removedTodoIds);
        return { ok: true };
      },
    }),
    [
      googleConnected,
      projects,
      areas,
      resources,
      removeProject,
      removeArea,
      removeResource,
      removeTodosMappedTo,
      clearMappingTo,
      dropSubtasksOfMany,
    ]
  );
}
