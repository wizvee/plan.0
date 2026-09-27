import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // 앱 셸(사이드바 · 하단 탭 · Inbox)은 `(app)/layout.tsx`에서 한 번만 렌더링한다.
  // 화면이 셸 컴포넌트를 직접 렌더링하거나 props로 조립하지 못하게 막는다 (REFACTORING-PLAN.md 4번).
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/components/shell/**", "src/app/(app)/layout.tsx"],
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
          ],
        },
      ],
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
