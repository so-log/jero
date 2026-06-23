import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // prettier 와 충돌하는 포맷팅 규칙 비활성화 (포맷은 prettier 가 전담). 항상 마지막에 둔다.
  prettier,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "coverage/**",
    "playwright-report/**",
    "test-results/**",
    // 디자인 시안/문서는 소스가 아니므로 린트 대상에서 제외.
    "docs/**",
  ]),
]);

export default eslintConfig;
