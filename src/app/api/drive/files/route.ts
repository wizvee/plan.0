import { NextResponse, type NextRequest } from "next/server";

import { listFiles, uploadFile } from "@/lib/google-drive";
import { requireGoogleAuth } from "@/lib/google-account";

/** ?folderId=<Drive 폴더 ID> — 그 폴더 안 파일 목록 (마크다운/PPT/PDF 등 종류 무관하게 전부). */
export async function GET(request: NextRequest) {
  const auth = await requireGoogleAuth();
  if (!auth.ok) return auth.error;

  const folderId = request.nextUrl.searchParams.get("folderId");
  if (!folderId) return NextResponse.json({ error: "folderId가 필요합니다." }, { status: 400 });

  const files = await listFiles(auth.refreshToken, folderId);
  return NextResponse.json({ files });
}

/** multipart/form-data: folderId + file — 바이너리 첨부파일(PPT/PDF/이미지 등) 업로드. */
export async function POST(request: NextRequest) {
  const auth = await requireGoogleAuth();
  if (!auth.ok) return auth.error;

  const form = await request.formData();
  const folderId = form.get("folderId");
  const file = form.get("file");

  if (typeof folderId !== "string" || !(file instanceof File)) {
    return NextResponse.json({ error: "folderId와 file이 필요합니다." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const uploaded = await uploadFile(auth.refreshToken, folderId, file.name, file.type || "application/octet-stream", buffer);
  return NextResponse.json({ file: uploaded }, { status: 201 });
}
