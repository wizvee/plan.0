import { NextResponse, type NextRequest } from "next/server";

import { createMarkdownFile, ensureContainerFolder } from "@/lib/google-drive";
import { handleGoogleApiError, requireGoogleAuth } from "@/lib/google-account";
import { serializeNoteContent, type NoteProperty } from "@/lib/frontmatter";
import type { ParaKind } from "@/lib/types";

const TABLE_BY_KIND: Record<ParaKind, "projects" | "areas" | "resources"> = {
  project: "projects",
  area: "areas",
  resource: "resources",
};

interface PromoteBody {
  kind?: ParaKind;
  containerId?: string;
  scrapIds?: string[];
}

/** 선택한 스크랩(들)을 하나의 Drive 마크다운 노트로 승격하고, 원본 스크랩은 삭제한다 (PLANNING.md 9.5). */
export async function POST(request: NextRequest) {
  const auth = await requireGoogleAuth();
  if (!auth.ok) return auth.error;

  const body: PromoteBody = await request.json().catch(() => ({}));
  const { kind, containerId, scrapIds } = body;
  if (!kind || !containerId || !TABLE_BY_KIND[kind] || !Array.isArray(scrapIds) || scrapIds.length === 0) {
    return NextResponse.json({ error: "kind, containerId, scrapIds가 필요합니다." }, { status: 400 });
  }

  const table = TABLE_BY_KIND[kind];
  const { data: container, error: containerError } = await auth.supabase
    .from(table)
    .select("id, name, drive_folder_id")
    .eq("id", containerId)
    .eq("user_id", auth.userId)
    .single();
  if (containerError || !container) {
    return NextResponse.json({ error: "해당 컨테이너를 찾을 수 없습니다." }, { status: 404 });
  }

  const { data: scraps, error: scrapsError } = await auth.supabase
    .from("todos")
    .select("id, content, url, memo")
    .in("id", scrapIds)
    .eq("user_id", auth.userId)
    .eq("kind", "note");
  if (scrapsError || !scraps || scraps.length === 0) {
    return NextResponse.json({ error: "선택한 스크랩을 찾을 수 없습니다." }, { status: 404 });
  }

  try {
    let folderId = container.drive_folder_id as string | null;
    if (!folderId) {
      folderId = await ensureContainerFolder(auth.refreshToken, kind, container.name);
      await auth.supabase.from(table).update({ drive_folder_id: folderId }).eq("id", containerId);
    }

    const title = scraps.length === 1 ? scraps[0].content : "새 노트";
    const urls = scraps.map((s) => s.url).filter((u): u is string => !!u);
    // URL 같은 구조화된 정보는 본문 텍스트가 아니라 옵시디언 Properties처럼 속성으로 분리한다.
    const properties: NoteProperty[] = [];
    if (urls.length > 0) properties.push({ key: "URL", type: "link", values: urls });
    properties.push({ key: "태그", type: "tag", values: [] });
    const bodyText = scraps.map((s) => `## ${s.content}\n\n${s.memo ?? ""}`.trimEnd()).join("\n\n---\n\n");
    const content = serializeNoteContent(properties, bodyText);

    const file = await createMarkdownFile(auth.refreshToken, folderId, title, content);

    await auth.supabase
      .from("todos")
      .delete()
      .in(
        "id",
        scraps.map((s) => s.id)
      )
      .eq("user_id", auth.userId);

    return NextResponse.json(
      { file, folderId, title, properties, body: bodyText, promotedScrapIds: scraps.map((s) => s.id) },
      { status: 201 }
    );
  } catch (err) {
    return handleGoogleApiError(auth, err);
  }
}
