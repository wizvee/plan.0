import { NextResponse, type NextRequest } from "next/server";

import { getFileBytes, trashFile } from "@/lib/google-drive";
import { handleGoogleApiError, requireGoogleAuth } from "@/lib/google-account";

/**
 * ?size=thumb|full — 이 사용자의 Drive에서 사진을 읽어 그대로 내려준다 (PHOTOS-PLAN.md).
 * Drive 파일 id는 클라이언트에서 받지 않고 이 사용자의 `todo_photos` 행에서 읽는다 — 남의 파일을 읽지 못하게.
 * 사진 내용은 안 바뀌므로(바꾸려면 지우고 새로 올림) 브라우저가 1년 캐시한다.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireGoogleAuth();
  if (!auth.ok) return auth.error;

  const { data: photo } = await auth.supabase
    .from("todo_photos")
    .select("drive_file_id, drive_thumb_id")
    .eq("id", id)
    .eq("user_id", auth.userId)
    .maybeSingle();
  if (!photo) return NextResponse.json({ error: "사진을 찾을 수 없습니다." }, { status: 404 });

  const fileId = request.nextUrl.searchParams.get("size") === "full" ? photo.drive_file_id : photo.drive_thumb_id;
  try {
    const bytes = await getFileBytes(auth.refreshToken, fileId);
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "private, max-age=31536000, immutable",
      },
    });
  } catch (err) {
    return handleGoogleApiError(auth, err);
  }
}

/** 원본 · 썸네일을 Drive 휴지통으로(30일 안 복구 가능) 옮기고 행을 지운다. */
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireGoogleAuth();
  if (!auth.ok) return auth.error;

  const { data: photo } = await auth.supabase
    .from("todo_photos")
    .select("drive_file_id, drive_thumb_id")
    .eq("id", id)
    .eq("user_id", auth.userId)
    .maybeSingle();
  if (!photo) return NextResponse.json({ deleted: false });

  try {
    await trashFile(auth.refreshToken, photo.drive_file_id);
    await trashFile(auth.refreshToken, photo.drive_thumb_id);
  } catch (err) {
    return handleGoogleApiError(auth, err);
  }

  const { error } = await auth.supabase.from("todo_photos").delete().eq("id", id).eq("user_id", auth.userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deleted: true });
}
