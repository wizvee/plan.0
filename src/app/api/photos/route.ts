import { NextResponse, type NextRequest } from "next/server";

import { ensurePhotoFolder, ensurePhotoThumbFolder, trashFile, uploadFile } from "@/lib/google-drive";
import { handleGoogleApiError, requireGoogleAuth } from "@/lib/google-account";

/** 원본(2048px) + 썸네일(640px) 합계 한도 — 호스팅 함수 본문 한도(4.5MB) 안쪽. 줄인 JPEG는 보통 1MB 안팎. */
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

/** Drive 폴더 이름 — "2026-09-19 새별오름", 날짜가 없으면 이름만 (PHOTOS-PLAN.md). */
function photoFolderName(content: string, scheduledDate: string | null): string {
  const name = content.replace(/[\\/]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80) || "사진";
  return scheduledDate ? `${scheduledDate} ${name}` : name;
}

/**
 * multipart/form-data: todoId + file(원본 JPEG) + thumb(썸네일 JPEG) — 브라우저에서 줄여서 보낸다(`lib/photo-resize.ts`).
 * 할 일의 사진 폴더(첫 사진이면 새로 만듦)에 원본을, .thumbs 폴더에 썸네일을 올리고 `todo_photos` 행을 만든다.
 * 그 할 일의 첫 사진이면 대표가 된다.
 */
export async function POST(request: NextRequest) {
  const auth = await requireGoogleAuth();
  if (!auth.ok) return auth.error;

  const form = await request.formData();
  const todoId = form.get("todoId");
  const file = form.get("file");
  const thumb = form.get("thumb");
  if (typeof todoId !== "string" || !(file instanceof File) || !(thumb instanceof File)) {
    return NextResponse.json({ error: "todoId · file · thumb가 필요합니다." }, { status: 400 });
  }
  if (file.type !== "image/jpeg" || thumb.type !== "image/jpeg") {
    return NextResponse.json({ error: "JPEG만 올릴 수 있습니다." }, { status: 400 });
  }
  if (file.size + thumb.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "사진이 너무 큽니다." }, { status: 413 });
  }

  const { data: todo } = await auth.supabase
    .from("todos")
    .select("id, content, scheduled_date")
    .eq("id", todoId)
    .eq("user_id", auth.userId)
    .maybeSingle();
  if (!todo) return NextResponse.json({ error: "할 일을 찾을 수 없습니다." }, { status: 404 });

  const { data: existing } = await auth.supabase
    .from("todo_photos")
    .select("drive_folder_id, is_cover")
    .eq("todo_id", todoId)
    .eq("user_id", auth.userId);

  try {
    // 폴더는 첫 사진 때 정해진 걸 계속 쓴다 — 할 일 이름 · 날짜를 나중에 바꿔도 사진이 흩어지지 않게
    const folderId =
      existing?.[0]?.drive_folder_id ??
      (await ensurePhotoFolder(auth.refreshToken, photoFolderName(todo.content, todo.scheduled_date)));
    const thumbFolderId = await ensurePhotoThumbFolder(auth.refreshToken);

    const id = crypto.randomUUID();
    const original = await uploadFile(
      auth.refreshToken,
      folderId,
      file.name || `${id}.jpg`,
      "image/jpeg",
      Buffer.from(await file.arrayBuffer())
    );
    const small = await uploadFile(auth.refreshToken, thumbFolderId, `${id}.jpg`, "image/jpeg", Buffer.from(await thumb.arrayBuffer()));

    const { data: row, error } = await auth.supabase
      .from("todo_photos")
      .insert({
        id,
        user_id: auth.userId,
        todo_id: todoId,
        drive_file_id: original.id,
        drive_thumb_id: small.id,
        drive_folder_id: folderId,
        is_cover: !(existing ?? []).some((p) => p.is_cover),
      })
      .select("*")
      .single();

    if (error || !row) {
      // 행을 못 만들면 방금 올린 파일은 어디서도 안 보이니 치운다
      await Promise.allSettled([trashFile(auth.refreshToken, original.id), trashFile(auth.refreshToken, small.id)]);
      return NextResponse.json({ error: error?.message ?? "사진을 저장하지 못했습니다." }, { status: 500 });
    }
    return NextResponse.json({ photo: row }, { status: 201 });
  } catch (err) {
    return handleGoogleApiError(auth, err);
  }
}
