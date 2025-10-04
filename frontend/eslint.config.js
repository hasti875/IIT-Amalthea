import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "node_modules", "*.config.js", "*.config.ts"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx,js,jsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": ["error", { 
        "argsIgnorePattern": "^_", 
        "varsIgnorePattern": "^_" 
      }],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/prefer-const": "error",
      "@typescript-eslint/no-var-requires": "error",
      "prefer-const": "error",
      "no-var": "error",
      "object-shorthand": "error",
      "prefer-template": "error",
      "template-curly-spacing": ["error", "never"],
      "no-console": ["warn", { "allow": ["warn", "error"] }],
      "no-debugger": "error",
      "eqeqeq": ["error", "always"],
      "curly": ["error", "multi-line"],
      "brace-style": ["error", "1tbs", { "allowSingleLine": true }],
      "comma-dangle": ["error", "never"],
      "semi": ["error", "always"],
      "quotes": ["error", "double", { "allowTemplateLiterals": true }],
      "jsx-quotes": ["error", "prefer-double"],
      "react-hooks/exhaustive-deps": "warn"
    },
  },
);
