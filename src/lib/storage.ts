"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { Todo } from "./types";

const STORAGE_KEY = "weekly-todo-planner:todos";

type Listener = () => void;
type Updater = Todo[] | ((prev: Todo[]) => Todo[]);

const EMPTY: Todo[] = [];

let snapshot: Todo[] = EMPTY;
let initialized = false;
const listeners = new Set<Listener>();

function readFromStorage(): Todo[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Todo[]) : [];
  } catch {
    return [];
  }
}

function ensureInitialized() {
  if (initialized || typeof window === "undefined") return;
  snapshot = readFromStorage();
  initialized = true;
}

function subscribe(listener: Listener) {
  ensureInitialized();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  ensureInitialized();
  return snapshot;
}

function getServerSnapshot() {
  return EMPTY;
}

function writeTodos(next: Todo[]) {
  snapshot = next;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }
  listeners.forEach((listener) => listener());
}

/**
 * 임시 저장소: 브라우저 localStorage에 저장 (기기 간 동기화는 아직 안 됨).
 * Supabase 연동 시 이 훅을 동일한 인터페이스([todos, setTodos])의
 * 서버 동기화 버전으로 교체할 예정.
 */
export function useLocalTodos() {
  const todos = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setTodos = useCallback((update: Updater) => {
    const next = typeof update === "function" ? update(snapshot) : update;
    writeTodos(next);
  }, []);

  return [todos, setTodos] as const;
}
