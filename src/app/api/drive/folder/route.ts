import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { ensureContainerFolder } from "@/lib/google-drive";
import { getGoogleRefreshToken, isInvalidGrantError, clearGoogleRefreshToken } from "@/lib/google-account";
import type { ParaKind } from "@/lib/types";

const TABLE_BY_KIND: Record<ParaKind, "projects" | "areas" | "resources"> = {
  project: "projects",
  area: "areas",
  resource: "resources",
};

interface FolderBody {
  kind?: ParaKind;
  containerId?: string;
}

/** 컨테이너(Project/Area/Resource)에 대응하는 Drive 폴더를 조회하고, 없으면 만들어 DB에 저장한다. */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const refreshToken = await getGoogleRefreshToken(supabase, user.id);
  if (!refreshToken) {
    return NextResponse.json({ error: "Google Drive 계정을 먼저 연결해주세요." }, { status: 409 });
  }

  let body: FolderBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON 본문이 필요합니다." }, { status: 400 });
  }

  const { kind, containerId } = body;
  if (!kind || !containerId || !TABLE_BY_KIND[kind]) {
    return NextResponse.json({ error: "kind와 containerId가 필요합니다." }, { status: 400 });
  }

  const table = TABLE_BY_KIND[kind];
  const { data: container, error: fetchError } = await supabase
    .from(table)
    .select("id, name, drive_folder_id")
    .eq("id", containerId)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !container) {
    return NextResponse.json({ error: "해당 컨테이너를 찾을 수 없습니다." }, { status: 404 });
  }

  if (container.drive_folder_id) {
    return NextResponse.json({ folderId: container.drive_folder_id, created: false });
  }

  let folderId: string;
  try {
    folderId = await ensureContainerFolder(refreshToken, kind, container.name);
  } catch (err) {
    if (isInvalidGrantError(err)) {
      await clearGoogleRefreshToken(supabase, user.id);
      return NextResponse.json(
        { error: "Google Drive 연결이 만료됐습니다. 사이드바에서 다시 연결해주세요." },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Drive 폴더 생성에 실패했습니다." },
      { status: 500 }
    );
  }

  const { error: updateError } = await supabase
    .from(table)
    .update({ drive_folder_id: folderId })
    .eq("id", containerId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ folderId, created: true });
}
