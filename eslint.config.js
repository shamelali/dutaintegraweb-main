// eslint.config.js — flat config for enterprise linting
import js from "@eslint/js";
export default [
  js.configs.recommended,
  {
    languageOptions: { ecmaVersion: 2022, sourceType: "module", globals: { console: "readonly", process: "readonly", fetch: "readonly", crypto: "readonly", URL: "readonly", URLSearchParams: "readonly", Request: "readonly", Response: "readonly", AbortSignal: "readonly", TextEncoder: "readonly", btoa: "readonly", atob: "readonly", setTimeout: "readonly", performance: "readonly" } },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "no-console": "off",
      "prefer-const": "warn",
      "no-useless-assignment": "off"
    }
  },
  {
    files: ["js/**/*.js"],
    languageOptions: {
      globals: {
        window: "readonly", document: "readonly", location: "readonly", navigator: "readonly",
        localStorage: "readonly", Blob: "readonly", FormData: "readonly", alert: "readonly", confirm: "readonly",
        setTimeout: "readonly", setInterval: "readonly", clearInterval: "readonly"
      }
    },
    rules: {
      "no-unused-vars": "off",
      "no-empty": "off"
    }
  },
  {
    files: ["api/**/*.js", "lib/**/*.js"],
    languageOptions: {
      globals: {
        process: "readonly", console: "readonly", fetch: "readonly", crypto: "readonly",
        URL: "readonly", URLSearchParams: "readonly", Request: "readonly", Response: "readonly",
        AbortSignal: "readonly", TextEncoder: "readonly", btoa: "readonly", atob: "readonly",
        setTimeout: "readonly", performance: "readonly", Blob: "readonly"
      }
    },
    rules: {
      "no-empty": "off"
    }
  },
  { ignores: ["node_modules/**", ".vercel/**", "dutaintegra-ultimate-bundle/**", "DUTA-INTEGRA-COMPLETE-HANDOVER/**"] }
];
