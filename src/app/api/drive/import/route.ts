import { NextResponse, type NextRequest } from "next/server";

import { addFileToFolder } from "@/lib/google-drive";
import { handleGoogleApiError, requireGoogleAuth } from "@/lib/google-account";

interface ImportBody {
  folderId?: string;
  fileIds?: string[];
}

/** { folderId, fileIds } — Google Picker로 고른 기존 파일들을 이 컨테이너 폴더의 자식으로 추가한다. */
export async function POST(request: NextRequest) {
  const auth = await requireGoogleAuth();
  if (!auth.ok) return auth.error;

  const body: ImportBody = await request.json().catch(() => ({}));
  const { folderId, fileIds } = body;
  if (typeof folderId !== "string" || !Array.isArray(fileIds) || fileIds.length === 0) {
    return NextResponse.json({ error: "folderId와 fileIds가 필요합니다." }, { status: 400 });
  }

  try {
    const files = await Promise.all(fileIds.map((fileId) => addFileToFolder(auth.refreshToken, fileId, folderId)));
    return NextResponse.json({ files }, { status: 201 });
  } catch (err) {
    return handleGoogleApiError(auth, err);
  }
}
