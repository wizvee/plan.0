"use client";

import { useEffect } from "react";

import { TodoDetailModal, type DetailTab } from "@/components/todo-detail-modal";
import { useTodos } from "@/lib/app-data/use-todos";
import { useContainers } from "@/lib/app-data/use-containers";
import { useTodoActions } from "@/lib/app-data/todo-actions";

/**
 * id로 할 일을 찾아 상세 팝업을 연다 — 목록 밖에서 할 일을 여는 곳(검색 결과 · 프로젝트 회고의 출처)이 같이 쓴다.
 * `initialTab`이면 그 탭으로 연다(검색: 메모에서 찾았으면 메모 탭). 팝업에서 할 일을 지우면 스스로 닫는다.
 */
export function TodoDetailById({
  todoId,
  initialTab,
  onClose,
}: {
  todoId: string;
  initialTab?: DetailTab;
  onClose: () => void;
}) {
  const { todos } = useTodos();
  const { projects, areas, resources } = useContainers();
  const actions = useTodoActions();
  const todo = todos.find((t) => t.id === todoId);

  // 다른 기기에서 지워졌거나 팝업에서 삭제했으면 여는 쪽 상태도 닫힘으로
  useEffect(() => {
    if (!todo) onClose();
  }, [todo, onClose]);

  if (!todo) return null;
  return (
    <TodoDetailModal
      todo={todo}
      projects={projects}
      areas={areas}
      resources={resources}
      initialTab={initialTab}
      onEdit={actions.edit}
      onMemoEdit={actions.editMemo}
      onUrlEdit={actions.editUrl}
      onAssignPara={actions.assignPara}
      onRemove={actions.remove}
      onConvert={actions.convert}
      onClose={onClose}
    />
  );
}
