"use client";

import { createContext, useContext, type ReactNode } from "react";

import { useSupabaseTodos } from "@/lib/supabase/todos";
import { useSupabaseSubtasks } from "@/lib/supabase/subtasks";
import { useSupabaseReflections } from "@/lib/supabase/reflections";
import { useSupabasePhotos } from "@/lib/supabase/photos";
import { useSupabaseContexts } from "@/lib/supabase/contexts";
import { useSupabaseGoals } from "@/lib/supabase/goals";
import { useSupabaseAreas, useSupabaseProjects, useSupabaseResources } from "@/lib/supabase/containers";

type TodosStore = ReturnType<typeof useSupabaseTodos>;
type SubtasksStore = ReturnType<typeof useSupabaseSubtasks>;
type ReflectionsStore = ReturnType<typeof useSupabaseReflections>;
type PhotosStore = ReturnType<typeof useSupabasePhotos>;
type ContextsStore = ReturnType<typeof useSupabaseContexts>;
type GoalsStore = ReturnType<typeof useSupabaseGoals>;
type ProjectsStore = ReturnType<typeof useSupabaseProjects>;
type AreasStore = ReturnType<typeof useSupabaseAreas>;
type ResourcesStore = ReturnType<typeof useSupabaseResources>;

interface AppData {
  userId: string;
  userEmail: string;
  googleConnected: boolean;
  todos: TodosStore;
  subtasks: SubtasksStore;
  reflections: ReflectionsStore;
  photos: PhotosStore;
  contexts: ContextsStore;
  goals: GoalsStore;
  projects: ProjectsStore;
  areas: AreasStore;
  resources: ResourcesStore;
}

const AppDataContext = createContext<AppData | null>(null);

/**
 * 할 일 · 하위 할 일 · 회고 · 사진 · Project/Area/Resource 데이터의 단일 출처 (REFACTORING-PLAN.md 1단계).
 * Supabase 조회 + Realtime 구독을 여기서 한 번만 하고, 화면/사이드바는 props 대신
 * `useTodos()` · `useSubtasks()` · `useReflections()` · `usePhotos()` · `useContainers()` · `useTodoActions()` · `useSession()` 훅으로 읽는다.
 * `(app)/layout.tsx`에서 한 번만 마운트되므로 화면을 옮겨도 다시 조회하지 않는다.
 */
export function AppDataProvider({
  userId,
  userEmail,
  googleConnected,
  children,
}: {
  userId: string;
  userEmail: string;
  googleConnected: boolean;
  children: ReactNode;
}) {
  const todos = useSupabaseTodos(userId);
  const subtasks = useSupabaseSubtasks(userId);
  const reflections = useSupabaseReflections(userId);
  const photos = useSupabasePhotos(userId);
  const contexts = useSupabaseContexts(userId);
  const goals = useSupabaseGoals(userId);
  const projects = useSupabaseProjects(userId);
  const areas = useSupabaseAreas(userId);
  const resources = useSupabaseResources(userId);

  return (
    <AppDataContext.Provider value={{ userId, userEmail, googleConnected, todos, subtasks, reflections, photos, contexts, goals, projects, areas, resources }}>{children}</AppDataContext.Provider>
  );
}

export function useAppData(): AppData {
  const value = useContext(AppDataContext);
  if (!value) throw new Error("useAppData는 AppDataProvider 안에서만 쓸 수 있습니다.");
  return value;
}

/** 로그인한 사용자 정보 + Google Drive 연결 여부 (서버 레이아웃에서 한 번 조회). */
export function useSession() {
  const { userId, userEmail, googleConnected } = useAppData();
  return { userId, userEmail, googleConnected };
}
