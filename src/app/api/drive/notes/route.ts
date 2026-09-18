import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createMarkdownFile, getFileContent, updateFileContent } from "@/lib/google-drive";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/** ?fileId=<Drive 파일 ID> — 인앱 마크다운 에디터에서 읽어올 노트 내용. */
export async function GET(request: NextRequest) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const fileId = request.nextUrl.searchParams.get("fileId");
  if (!fileId) return NextResponse.json({ error: "fileId가 필요합니다." }, { status: 400 });

  const content = await getFileContent(fileId);
  return NextResponse.json({ content });
}

/** { folderId, title } — 그 폴더에 새 마크다운 노트 파일을 만든다. */
export async function POST(request: NextRequest) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const folderId = body?.folderId;
  const title = body?.title;
  if (typeof folderId !== "string" || typeof title !== "string" || !title.trim()) {
    return NextResponse.json({ error: "folderId와 title이 필요합니다." }, { status: 400 });
  }

  const file = await createMarkdownFile(folderId, title.trim(), `# ${title.trim()}\n\n`);
  return NextResponse.json({ file }, { status: 201 });
}

/** { fileId, content } — 인앱 에디터에서 수정한 노트 내용을 저장한다. */
export async function PUT(request: NextRequest) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const fileId = body?.fileId;
  const content = body?.content;
  if (typeof fileId !== "string" || typeof content !== "string") {
    return NextResponse.json({ error: "fileId와 content가 필요합니다." }, { status: 400 });
  }

  await updateFileContent(fileId, content);
  return NextResponse.json({ ok: true });
}
