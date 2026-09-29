"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/client";
import { fetchAllRows } from "@/lib/supabase/fetch-all";
import { jpegName, resizeForUpload } from "@/lib/photos";
import type { TodoPhoto } from "@/lib/types";

interface PhotoRow {
  id: string;
  user_id: string;
  todo_id: string;
  drive_file_id: string;
  drive_thumb_id: string;
  drive_folder_id: string;
  is_cover: boolean;
  created_at: string;
}

function fromRow(row: PhotoRow): TodoPhoto {
  return {
    id: row.id,
    todoId: row.todo_id,
    driveFolderId: row.drive_folder_id,
    driveFileId: row.drive_file_id,
    isCover: row.is_cover,
    createdAt: row.created_at,
  };
}

/**
 * 할 일 사진(`todo_photos`) 조회 + Realtime 구독 + 올리기 · 지우기 · 대표 지정 (PHOTOS-PLAN.md).
 * 파일은 Drive에 있어서 올리기 · 지우기는 `/api/photos`를 거치고, 대표 지정만 DB를 바로 고친다.
 * `AppDataProvider`에서 한 번만 호출된다.
 */
export function useSupabasePhotos(userId: string) {
  const [supabase] = useState(() => createClient());
  const [photos, setPhotos] = useState<TodoPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  // 지우기 실패 시 되돌리기 · 대표 지정에 쓰는 최신 목록
  const photosRef = useRef(photos);
  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);

  useEffect(() => {
    let active = true;

    fetchAllRows(supabase, "todo_photos").then(({ data, error }) => {
      if (!active) return;
      if (!error && data) setPhotos((data as PhotoRow[]).map(fromRow));
      setLoading(false);
    });

    const channel = supabase
      .channel(`photos-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "todo_photos", filter: `user_id=eq.${userId}` },
        (payload: RealtimePostgresChangesPayload<PhotoRow>) => {
          setPhotos((prev) => {
            // DELETE는 old에 id만 온다 (할 일 삭제로 cascade된 행도 이 경로로 들어옴)
            if (payload.eventType === "DELETE") {
              const oldId = (payload.old as Partial<PhotoRow>).id;
              return prev.filter((p) => p.id !== oldId);
            }
            const next = fromRow(payload.new as PhotoRow);
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

  /** 줄여서 올린다. 실패하면 사용자에게 보여줄 메시지로 throw. */
  const uploadPhoto = useCallback(async (todoId: string, file: File) => {
    const { full, thumb } = await resizeForUpload(file);
    const form = new FormData();
    form.append("todoId", todoId);
    form.append("file", full, jpegName(file.name));
    form.append("thumb", thumb, "thumb.jpg");

    const res = await fetch("/api/photos", { method: "POST", body: form });
    const body = (await res.json().catch(() => ({}))) as { photo?: PhotoRow; error?: string };
    if (!res.ok || !body.photo) throw new Error(body.error ?? "사진을 올리지 못했어요.");

    const photo = fromRow(body.photo);
    setPhotos((prev) => (prev.some((p) => p.id === photo.id) ? prev : [...prev, photo]));
  }, []);

  /** Drive 휴지통으로 옮기고 행을 지운다. 지운 게 대표였으면 남은 것 중 먼저 올린 사진이 대표로 보인다(`coverOf`). */
  const removePhoto = useCallback(async (id: string) => {
    const removed = photosRef.current.find((p) => p.id === id);
    setPhotos((prev) => prev.filter((p) => p.id !== id));

    const res = await fetch(`/api/photos/${id}`, { method: "DELETE" });
    if (!res.ok && removed) {
      setPhotos((prev) => (prev.some((p) => p.id === id) ? prev : [...prev, removed]));
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(body.error ?? "사진을 지우지 못했어요.");
    }
  }, []);

  /** 할 일당 대표는 하나(부분 unique 인덱스) — 기존 대표를 먼저 끄고 켠다. */
  const setCoverPhoto = useCallback(
    async (id: string) => {
      const target = photosRef.current.find((p) => p.id === id);
      if (!target || target.isCover) return;
      const { todoId } = target;
      setPhotos((prev) => prev.map((p) => (p.todoId === todoId ? { ...p, isCover: p.id === id } : p)));

      const off = await supabase.from("todo_photos").update({ is_cover: false }).eq("todo_id", todoId).eq("is_cover", true);
      const on = off.error ? off : await supabase.from("todo_photos").update({ is_cover: true }).eq("id", id);
      if (on.error) {
        // 실패하면 DB 값으로 되돌린다
        const { data } = await supabase.from("todo_photos").select("*").eq("todo_id", todoId);
        if (data) {
          const fresh = (data as PhotoRow[]).map(fromRow);
          setPhotos((prev) => [...prev.filter((p) => p.todoId !== todoId), ...fresh]);
        }
      }
    },
    [supabase]
  );

  return { photos, loading, uploadPhoto, removePhoto, setCoverPhoto };
}
