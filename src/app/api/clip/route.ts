import { NextResponse, type NextRequest } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";

interface ClipBody {
  title?: string;
  url?: string;
  memo?: string;
}

export async function POST(request: NextRequest) {
  const secret = process.env.CLIP_API_SECRET;
  const userId = process.env.CLIP_USER_ID;
  if (!secret || !userId) {
    return NextResponse.json({ error: "서버에 CLIP_API_SECRET / CLIP_USER_ID가 설정되지 않았습니다." }, { status: 500 });
  }

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "인증 실패" }, { status: 401 });
  }

  let body: ClipBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON 본문이 필요합니다." }, { status: 400 });
  }

  const rawUrl = body.url?.trim();
  if (!rawUrl) {
    return NextResponse.json({ error: "url은 필수입니다." }, { status: 400 });
  }
  try {
    new URL(rawUrl);
  } catch {
    return NextResponse.json({ error: "url 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const title = body.title?.trim() || rawUrl;
  const memo = body.memo?.trim() || null;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("todos")
    .insert({
      user_id: userId,
      content: title,
      url: rawUrl,
      memo,
      day: null,
      week_start: null,
      completed: false,
      // 항상 목록 맨 뒤에 오도록 현재 시각을 정렬 키로 사용 (기존 position 값보다 항상 큼).
      position: Date.now(),
    })
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "저장에 실패했습니다." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: data.id }, { status: 201 });
}
