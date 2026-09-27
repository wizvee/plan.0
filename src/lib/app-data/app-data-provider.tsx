"use client";

import { createContext, useContext, type ReactNode } from "react";

import { useSupabaseTodos } from "@/lib/supabase/todos";
import { useSupabaseAreas, useSupabaseProjects, useSupabaseResources } from "@/lib/supabase/containers";

type TodosStore = ReturnType<typeof useSupabaseTodos>;
type ProjectsStore = ReturnType<typeof useSupabaseProjects>;
type AreasStore = ReturnType<typeof useSupabaseAreas>;
type ResourcesStore = ReturnType<typeof useSupabaseResources>;

interface AppData {
  userId: string;
  todos: TodosStore;
  projects: ProjectsStore;
  areas: AreasStore;
  resources: ResourcesStore;
}

const AppDataContext = createContext<AppData | null>(null);

/**
 * 할 일 · Project/Area/Resource 데이터의 단일 출처 (REFACTORING-PLAN.md 1단계).
 * Supabase 조회 + Realtime 구독을 여기서 한 번만 하고, 화면/사이드바는 props 대신
 * `useTodos()` · `useContainers()` · `useTodoActions()` 훅으로 읽는다.
 */
export function AppDataProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const todos = useSupabaseTodos(userId);
  const projects = useSupabaseProjects(userId);
  const areas = useSupabaseAreas(userId);
  const resources = useSupabaseResources(userId);

  return (
    <AppDataContext.Provider value={{ userId, todos, projects, areas, resources }}>{children}</AppDataContext.Provider>
  );
}

export function useAppData(): AppData {
  const value = useContext(AppDataContext);
  if (!value) throw new Error("useAppData는 AppDataProvider 안에서만 쓸 수 있습니다.");
  return value;
}
