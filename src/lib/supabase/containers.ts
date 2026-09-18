"use client";

import { useCallback, useEffect, useState } from "react";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/client";
import type { Area, ParaContainer, Project, Resource } from "@/lib/types";

interface ProjectRow {
  id: string;
  user_id: string;
  name: string;
  status: "active" | "completed";
  start_date: string;
  due_date: string | null;
  created_at: string;
  completed_at: string | null;
  drive_folder_id: string | null;
}

function projectFromRow(row: ProjectRow): Project {
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    startDate: row.start_date,
    dueDate: row.due_date,
    createdAt: row.created_at,
    completedAt: row.completed_at,
    driveFolderId: row.drive_folder_id,
  };
}

type ProjectPatch = Partial<
  Pick<Project, "name" | "status" | "startDate" | "dueDate" | "completedAt" | "driveFolderId">
>;

export function useSupabaseProjects(userId: string) {
  const [supabase] = useState(() => createClient());
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    supabase
      .from("projects")
      .select("*")
      .then(({ data, error }) => {
        if (!active) return;
        if (!error && data) setProjects((data as ProjectRow[]).map(projectFromRow));
        setLoading(false);
      });

    const channel = supabase
      .channel(`projects-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "projects", filter: `user_id=eq.${userId}` },
        (payload: RealtimePostgresChangesPayload<ProjectRow>) => {
          setProjects((prev) => {
            if (payload.eventType === "DELETE") {
              const oldId = (payload.old as Partial<ProjectRow>).id;
              return prev.filter((p) => p.id !== oldId);
            }
            const next = projectFromRow(payload.new as ProjectRow);
            const exists = prev.some((p) => p.id === next.id);
            return exists ? prev.map((p) => (p.id === next.id ? next : p)) : [...prev, next];
          });
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [supabase, userId]);

  const addProject = useCallback(
    async (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;

      const optimisticId = crypto.randomUUID();
      const today = new Date().toISOString().slice(0, 10);
      setProjects((prev) => [
        ...prev,
        {
          id: optimisticId,
          name: trimmed,
          status: "active",
          startDate: today,
          dueDate: null,
          createdAt: new Date().toISOString(),
          completedAt: null,
          driveFolderId: null,
        },
      ]);

      const { data, error } = await supabase
        .from("projects")
        .insert({ user_id: userId, name: trimmed })
        .select()
        .single();

      if (error || !data) {
        setProjects((prev) => prev.filter((p) => p.id !== optimisticId));
        return;
      }
      setProjects((prev) => prev.map((p) => (p.id === optimisticId ? projectFromRow(data as ProjectRow) : p)));
    },
    [supabase, userId]
  );

  const updateProject = useCallback(
    async (id: string, patch: ProjectPatch) => {
      setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));

      const dbPatch: Record<string, unknown> = {};
      if (patch.name !== undefined) dbPatch.name = patch.name;
      if (patch.status !== undefined) dbPatch.status = patch.status;
      if (patch.startDate !== undefined) dbPatch.start_date = patch.startDate;
      if (patch.dueDate !== undefined) dbPatch.due_date = patch.dueDate;
      if (patch.completedAt !== undefined) dbPatch.completed_at = patch.completedAt;
      if (patch.driveFolderId !== undefined) dbPatch.drive_folder_id = patch.driveFolderId;

      await supabase.from("projects").update(dbPatch).eq("id", id);
    },
    [supabase]
  );

  const removeProject = useCallback(
    async (id: string) => {
      setProjects((prev) => prev.filter((p) => p.id !== id));
      await supabase.from("projects").delete().eq("id", id);
    },
    [supabase]
  );

  return { projects, loading, addProject, updateProject, removeProject };
}

interface ContainerRow {
  id: string;
  user_id: string;
  name: string;
  archived: boolean;
  created_at: string;
  drive_folder_id: string | null;
}

function containerFromRow(row: ContainerRow): ParaContainer {
  return {
    id: row.id,
    name: row.name,
    archived: row.archived,
    createdAt: row.created_at,
    driveFolderId: row.drive_folder_id,
  };
}

type ContainerPatch = Partial<Pick<ParaContainer, "name" | "archived" | "driveFolderId">>;

function useSupabaseContainerTable(table: "areas" | "resources", userId: string) {
  const [supabase] = useState(() => createClient());
  const [items, setItems] = useState<ParaContainer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    supabase
      .from(table)
      .select("*")
      .then(({ data, error }) => {
        if (!active) return;
        if (!error && data) setItems((data as ContainerRow[]).map(containerFromRow));
        setLoading(false);
      });

    const channel = supabase
      .channel(`${table}-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table, filter: `user_id=eq.${userId}` },
        (payload: RealtimePostgresChangesPayload<ContainerRow>) => {
          setItems((prev) => {
            if (payload.eventType === "DELETE") {
              const oldId = (payload.old as Partial<ContainerRow>).id;
              return prev.filter((c) => c.id !== oldId);
            }
            const next = containerFromRow(payload.new as ContainerRow);
            const exists = prev.some((c) => c.id === next.id);
            return exists ? prev.map((c) => (c.id === next.id ? next : c)) : [...prev, next];
          });
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [supabase, table, userId]);

  const addItem = useCallback(
    async (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;

      const optimisticId = crypto.randomUUID();
      setItems((prev) => [
        ...prev,
        { id: optimisticId, name: trimmed, archived: false, createdAt: new Date().toISOString(), driveFolderId: null },
      ]);

      const { data, error } = await supabase
        .from(table)
        .insert({ user_id: userId, name: trimmed })
        .select()
        .single();

      if (error || !data) {
        setItems((prev) => prev.filter((c) => c.id !== optimisticId));
        return;
      }
      setItems((prev) => prev.map((c) => (c.id === optimisticId ? containerFromRow(data as ContainerRow) : c)));
    },
    [supabase, table, userId]
  );

  const updateItem = useCallback(
    async (id: string, patch: ContainerPatch) => {
      setItems((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));

      const dbPatch: Record<string, unknown> = {};
      if (patch.name !== undefined) dbPatch.name = patch.name;
      if (patch.archived !== undefined) dbPatch.archived = patch.archived;
      if (patch.driveFolderId !== undefined) dbPatch.drive_folder_id = patch.driveFolderId;

      await supabase.from(table).update(dbPatch).eq("id", id);
    },
    [supabase, table]
  );

  const removeItem = useCallback(
    async (id: string) => {
      setItems((prev) => prev.filter((c) => c.id !== id));
      await supabase.from(table).delete().eq("id", id);
    },
    [supabase, table]
  );

  return { items, loading, addItem, updateItem, removeItem };
}

export function useSupabaseAreas(userId: string) {
  const { items, loading, addItem, updateItem, removeItem } = useSupabaseContainerTable("areas", userId);
  return { areas: items as Area[], loading, addArea: addItem, updateArea: updateItem, removeArea: removeItem };
}

export function useSupabaseResources(userId: string) {
  const { items, loading, addItem, updateItem, removeItem } = useSupabaseContainerTable("resources", userId);
  return {
    resources: items as Resource[],
    loading,
    addResource: addItem,
    updateResource: updateItem,
    removeResource: removeItem,
  };
}
