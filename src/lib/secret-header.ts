import { timingSafeEqual } from "node:crypto";

/** `Authorization: Bearer <secret>` 비교 — 길이가 같을 때만 timingSafeEqual (서버 전용) */
export function bearerMatches(header: string | null, secret: string) {
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(header ?? "");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
