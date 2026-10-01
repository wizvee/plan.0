"use client";

import { useCallback } from "react";

import { useContexts } from "@/lib/app-data/use-contexts";
import { contextColor, contextTint } from "@/lib/context-color";
import type { Context, ParaKind, Todo } from "@/lib/types";

/** 색 — 진한 색(막대 · 점 · 체크 · 진행률)과 옅은 바탕(블록 · 타일 · 칩) */
export interface ParaColor {
  color: string;
  tint: string;
  /** 이 색의 컨텍스트(영역) — 컨텍스트가 하나도 없으면 null */
  context: Context | null;
}

/** 컨텍스트가 하나도 없을 때(마이그레이션 전) — 예전 "매핑 없음" 회색 */
const NONE: ParaColor = { color: "var(--muted-foreground)", tint: "var(--secondary)", context: null };

type Mapping = Pick<Todo, "projectId" | "areaId" | "resourceId">;

function colorOf(context: Context | null): ParaColor {
  return context ? { color: contextColor(context.color), tint: contextTint(context.color), context } : NONE;
}

/**
 * 할 일 · PARA · 주간 목표의 색 = 그 영역(컨텍스트)의 색 (2026-10-01, 시안 https://claude.ai/artifact/9V2Fz7bEfE3DhEqha5kyPg).
 * PARA 종류(Project / Area / Resource)는 색이 아니라 탭 · 그룹 순서 · 아이콘으로 구분한다.
 * 할 일은 매핑된 PARA의 컨텍스트, 매핑이 없으면 기본(기타) 컨텍스트 — `useContexts`와 같은 규칙.
 */
export function useParaColor() {
  const { contextOfTodo, contextOfContainer } = useContexts();

  /** 할 일 · 목표처럼 PARA 매핑(projectId/areaId/resourceId)을 가진 것 */
  const ofMapping = useCallback((mapping: Mapping): ParaColor => colorOf(contextOfTodo(mapping)), [contextOfTodo]);

  /** PARA 컨테이너 하나 — 종류와 id로 */
  const ofContainer = useCallback(
    (kind: ParaKind, id: string): ParaColor =>
      colorOf(
        contextOfTodo({
          projectId: kind === "project" ? id : null,
          areaId: kind === "area" ? id : null,
          resourceId: kind === "resource" ? id : null,
        })
      ),
    [contextOfTodo]
  );

  /** 컨테이너의 `contextId` 값으로(목록 카드처럼 이미 행을 들고 있을 때) — null = 기본 */
  const ofContextId = useCallback(
    (contextId: string | null): ParaColor => colorOf(contextOfContainer(contextId)),
    [contextOfContainer]
  );

  return { ofMapping, ofContainer, ofContextId };
}
