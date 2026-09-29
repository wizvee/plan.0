import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

/** 한 번에 요청하는 행 수. Supabase 프로젝트 설정의 Max Rows(기본 1000)와 맞춘다 */
const PAGE_SIZE = 1000;

/**
 * 테이블을 끝까지 읽는다(RLS가 내 행만 돌려준다).
 *
 * Supabase API는 요청 한 번에 돌려주는 행 수에 상한(Max Rows, 기본 1000)이 있어서 `select("*")` 한 번으로는
 * 그 뒤 행이 오류 없이 잘린다 — 할 일 · 하위 할 일이 쌓이면 캘린더에서 조용히 사라지는 버그였다.
 * 첫 요청으로 전체 개수와 실제로 한 번에 오는 행 수를 알아낸 뒤, 나머지 구간은 병렬로 받는다.
 * 1000행 이하면 지금까지처럼 요청 한 번으로 끝난다.
 *
 * 구간이 겹치거나 비지 않게 만든 순(created_at, 같으면 id)으로 고정한다 — 정렬 없이 쓰는 목록(PARA 선택
 * 메뉴 등)도 전처럼 대략 만든 순으로 보인다. 읽는 사이에 행이 추가돼 생길 수 있는 중복은 id로 거른다
 * (읽은 뒤의 변경은 각 스토어의 Realtime 구독이 맞춘다). 모든 대상 테이블에 created_at이 있다.
 */
export async function fetchAllRows(
  supabase: SupabaseClient,
  table: string
): Promise<{ data: { id: string }[] | null; error: PostgrestError | null }> {
  const first = await supabase.from(table).select("*", { count: "exact" }).order("created_at").order("id").range(0, PAGE_SIZE - 1);
  if (first.error) return { data: null, error: first.error };

  const rows = (first.data ?? []) as { id: string }[];
  const total = first.count ?? rows.length;
  // 서버 상한이 PAGE_SIZE보다 작게 설정돼 있으면 실제로 온 만큼을 한 구간으로 본다
  const pageSize = rows.length;
  if (pageSize === 0 || pageSize >= total) return { data: rows, error: null };

  const requests = [];
  for (let from = pageSize; from < total; from += pageSize) {
    requests.push(supabase.from(table).select("*").order("created_at").order("id").range(from, from + pageSize - 1));
  }
  for (const result of await Promise.all(requests)) {
    if (result.error) return { data: null, error: result.error };
    rows.push(...((result.data ?? []) as { id: string }[]));
  }

  const seen = new Set<string>();
  return { data: rows.filter((row) => !seen.has(row.id) && seen.add(row.id)), error: null };
}
