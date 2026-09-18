import { NextResponse, type NextRequest } from "next/server";

import { createMarkdownFile, getFileContent, renameFile, updateFileContent } from "@/lib/google-drive";
import { handleGoogleApiError, requireGoogleAuth } from "@/lib/google-account";

/** ?fileId=<Drive 파일 ID> — 인앱 마크다운 에디터에서 읽어올 노트 내용. */
export async function GET(request: NextRequest) {
  const auth = await requireGoogleAuth();
  if (!auth.ok) return auth.error;

  const fileId = request.nextUrl.searchParams.get("fileId");
  if (!fileId) return NextResponse.json({ error: "fileId가 필요합니다." }, { status: 400 });

  try {
    const content = await getFileContent(auth.refreshToken, fileId);
    return NextResponse.json({ content });
  } catch (err) {
    return handleGoogleApiError(auth, err);
  }
}

/** { folderId, title } — 그 폴더에 새 마크다운 노트 파일을 만든다. */
export async function POST(request: NextRequest) {
  const auth = await requireGoogleAuth();
  if (!auth.ok) return auth.error;

  const body = await request.json().catch(() => null);
  const folderId = body?.folderId;
  const title = body?.title;
  if (typeof folderId !== "string" || typeof title !== "string" || !title.trim()) {
    return NextResponse.json({ error: "folderId와 title이 필요합니다." }, { status: 400 });
  }

  try {
    const file = await createMarkdownFile(auth.refreshToken, folderId, title.trim(), `# ${title.trim()}\n\n`);
    return NextResponse.json({ file }, { status: 201 });
  } catch (err) {
    return handleGoogleApiError(auth, err);
  }
}

/** { fileId, content, title? } — 인앱 에디터에서 수정한 노트 내용을 저장한다. title이 있으면 파일명도 바꾼다. */
export async function PUT(request: NextRequest) {
  const auth = await requireGoogleAuth();
  if (!auth.ok) return auth.error;

  const body = await request.json().catch(() => null);
  const fileId = body?.fileId;
  const content = body?.content;
  const title = body?.title;
  if (typeof fileId !== "string" || typeof content !== "string") {
    return NextResponse.json({ error: "fileId와 content가 필요합니다." }, { status: 400 });
  }

  try {
    await updateFileContent(auth.refreshToken, fileId, content);
    if (typeof title === "string" && title.trim()) {
      const name = title.trim().endsWith(".md") ? title.trim() : `${title.trim()}.md`;
      await renameFile(auth.refreshToken, fileId, name);
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleGoogleApiError(auth, err);
  }
}
