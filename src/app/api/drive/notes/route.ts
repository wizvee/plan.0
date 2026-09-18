import { NextResponse, type NextRequest } from "next/server";

import { createMarkdownFile, getFileContent, updateFileContent } from "@/lib/google-drive";
import { requireGoogleAuth } from "@/lib/google-account";

/** ?fileId=<Drive 파일 ID> — 인앱 마크다운 에디터에서 읽어올 노트 내용. */
export async function GET(request: NextRequest) {
  const auth = await requireGoogleAuth();
  if (!auth.ok) return auth.error;

  const fileId = request.nextUrl.searchParams.get("fileId");
  if (!fileId) return NextResponse.json({ error: "fileId가 필요합니다." }, { status: 400 });

  const content = await getFileContent(auth.refreshToken, fileId);
  return NextResponse.json({ content });
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

  const file = await createMarkdownFile(auth.refreshToken, folderId, title.trim(), `# ${title.trim()}\n\n`);
  return NextResponse.json({ file }, { status: 201 });
}

/** { fileId, content } — 인앱 에디터에서 수정한 노트 내용을 저장한다. */
export async function PUT(request: NextRequest) {
  const auth = await requireGoogleAuth();
  if (!auth.ok) return auth.error;

  const body = await request.json().catch(() => null);
  const fileId = body?.fileId;
  const content = body?.content;
  if (typeof fileId !== "string" || typeof content !== "string") {
    return NextResponse.json({ error: "fileId와 content가 필요합니다." }, { status: 400 });
  }

  await updateFileContent(auth.refreshToken, fileId, content);
  return NextResponse.json({ ok: true });
}
