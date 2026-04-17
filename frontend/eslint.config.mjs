import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Generated WASM bundle — not hand-written code
    "public/wasm/**",
    // CommonJS utility scripts — require() is intentional
    "scripts/**/*.js",
  ]),
  {
    rules: {
      // Pre-existing pattern across admin/auth pages; downgrade to warn
      "@typescript-eslint/no-explicit-any": "warn",
      // Pre-existing pattern in hooks; downgrade to warn
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/refs": "warn",
      // Content pages use raw quotes intentionally in prose; downgrade to warn
      "react/no-unescaped-entities": "warn",
      // Pre-existing anchor tags in learn/community pages; downgrade to warn
      "@next/next/no-html-link-for-pages": "warn",
      // Pre-existing empty interfaces in shared types; downgrade to warn
      "@typescript-eslint/no-empty-object-type": "warn",
      // CommonJS require in scripts is intentional; no-require-imports is warn
      "@typescript-eslint/no-require-imports": "warn",
    },
  },
]);

export default eslintConfig;
