import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// 아이콘은 `@/components/icons` 한 곳에서만 가져온다(Phosphor를 아이콘별 경로로 re-export — 개발 서버 속도 · 굵기 규칙).
const ICON_IMPORT_PATTERN = {
  group: ["lucide-react", "@phosphor-icons/react", "@phosphor-icons/react/*"],
  message: "아이콘은 @/components/icons에서 가져오세요. 없는 아이콘은 그 파일에 한 줄 추가합니다.",
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // 앱 셸(사이드바 · 하단 탭 · Inbox)은 `(app)/layout.tsx`에서 한 번만 렌더링한다.
  // 화면이 셸 컴포넌트를 직접 렌더링하거나 props로 조립하지 못하게 막는다 (REFACTORING-PLAN.md 4번).
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/components/shell/**", "src/app/(app)/layout.tsx", "src/components/icons.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/components/shell/*", "**/components/shell/*"],
              message:
                "셸(사이드바 · 하단 탭 · Inbox)은 (app)/layout.tsx에서만 렌더링합니다. 화면은 본문만 그리세요.",
            },
            ICON_IMPORT_PATTERN,
          ],
        },
      ],
    },
  },
  // 셸 · 앱 레이아웃은 위 규칙에서 빠지므로 아이콘 규칙만 따로 건다.
  {
    files: ["src/components/shell/**/*.{ts,tsx}", "src/app/(app)/layout.tsx"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [ICON_IMPORT_PATTERN] }],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
