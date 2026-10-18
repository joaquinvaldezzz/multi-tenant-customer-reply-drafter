import path from "node:path";
import { includeIgnoreFile } from "@eslint/config-helpers";
import js from "@eslint/js";
import { plugin as shadcnPlugin } from "@shadcn/lint";
import { configs, plugins, rules } from "eslint-config-airbnb-extended";
import { rules as prettierConfigRules } from "eslint-config-prettier";
import perfectionistPlugin from "eslint-plugin-perfectionist";
import prettierPlugin from "eslint-plugin-prettier";
import { defineConfig } from "eslint/config";

const gitignorePath = path.resolve(".", ".gitignore");

const jsConfig = defineConfig([
  // ESLint recommended config
  {
    name: "js/config",
    ...js.configs.recommended,
  },
  // Stylistic plugin
  plugins.stylistic,
  // Import X plugin
  plugins.importX,
  // Airbnb base recommended config
  ...configs.base.recommended,
  // Strict import rules
  rules.base.importsStrict,
  {
    rules: {
      // Disable Import X order rules to avoid conflicts with `@ianvs/prettier-plugin-sort-imports`
      "import-x/order": "off",
      "import-x/prefer-default-export": "off",
      "import-x/no-unresolved": ["error", { ignore: ["bun:test"] }],
    },
  },
]);

const nextConfig = defineConfig([
  // React plugin
  plugins.react,
  // React hooks plugin
  plugins.reactHooks,
  // React JSX A11y plugin
  plugins.reactA11y,
  // Next.js plugin
  plugins.next,
  // Airbnb Next.js recommended config
  ...configs.next.recommended,
  // Strict React rules
  rules.react.strict,
  {
    rules: {
      "react/function-component-definition": ["error", { namedComponents: "function-declaration" }],
      "react/jsx-sort-props": "off",
      // "react/no-unknown-property": ["error", { ignore: ["tw"] }],
      "react/require-default-props": ["error", { functions: "ignore" }],
    },
  },
]);

const typescriptConfig = defineConfig([
  // TypeScript ESLint plugin
  plugins.typescriptEslint,
  // Airbnb base TypeScript config
  ...configs.base.typescript,
  // Strict TypeScript rules
  rules.typescript.typescriptEslintStrict,
  // Airbnb Next.js TypeScript config
  ...configs.next.typescript,
  {
    rules: {
      "@typescript-eslint/explicit-module-boundary-types": "off",
      // "no-underscore-dangle": ["error", { allow: ["_meta"] }],
    },
  },
]);

const perfectionistConfig = defineConfig([
  {
    plugins: {
      perfectionist: perfectionistPlugin,
    },
    rules: {
      "perfectionist/sort-jsx-props": [
        "error",
        {
          type: "natural",
          groups: [
            "className",
            "tw",
            "style",
            "id",
            "name",
            "control",
            "data",
            "src",
            "for",
            "type",
            "placeholder",
            "href",
            "value",
            "title",
            "alt",
            "role",
            "aria",
            "tabIndex",
            "callback",
            "shorthand-prop",
            "multiline-prop",
            "unknown",
          ],
          customGroups: [
            {
              groupName: "className",
              elementNamePattern: "className",
            },
            {
              groupName: "tw",
              elementNamePattern: "tw",
            },
            {
              groupName: "style",
              elementNamePattern: "style",
            },
            {
              groupName: "id",
              elementNamePattern: "id",
            },
            {
              groupName: "name",
              elementNamePattern: "name",
            },
            {
              groupName: "control",
              elementNamePattern: "control",
            },
            {
              groupName: "data",
              elementNamePattern: "^data-.+",
            },
            {
              groupName: "src",
              elementNamePattern: "src",
            },
            {
              groupName: "for",
              elementNamePattern: "for",
            },
            {
              groupName: "type",
              elementNamePattern: "type",
            },
            {
              groupName: "placeholder",
              elementNamePattern: "placeholder",
            },
            {
              groupName: "href",
              elementNamePattern: "href",
            },
            {
              groupName: "value",
              elementNamePattern: "value",
            },
            {
              groupName: "title",
              elementNamePattern: "title",
            },
            {
              groupName: "alt",
              elementNamePattern: "alt",
            },
            {
              groupName: "role",
              elementNamePattern: "role",
            },
            {
              groupName: "aria",
              elementNamePattern: "^aria-.+",
            },
            {
              groupName: "tabIndex",
              elementNamePattern: "tabIndex",
            },
            {
              groupName: "callback",
              elementNamePattern: "^on.+",
            },
          ],
        },
      ],
    },
  },
]);

const shadcnConfig = defineConfig([
  {
    name: "shadcn/config",
    plugins: {
      shadcn: shadcnPlugin,
    },
    rules: {
      // "shadcn/no-restyle": ["error", { allow: ["layout"] }],
      "shadcn/no-raw-colors": "error",
      "shadcn/no-arbitrary-values": ["error", { allow: ["layout"] }],
      // "shadcn/no-inline-styles": "error",
      "shadcn/no-unknown-classes": "warn",
      "shadcn/require-static-classes": "error",
    },
  },
]);

const prettierConfig = defineConfig([
  // Prettier plugin
  {
    name: "prettier/plugin/config",
    plugins: {
      prettier: prettierPlugin,
    },
  },
  // Prettier config
  {
    name: "prettier/config",
    rules: {
      ...prettierConfigRules,
      "prettier/prettier": "error",
    },
  },
]);

export default defineConfig([
  // Ignore files and folders listed in .gitignore
  includeIgnoreFile(gitignorePath),
  // JavaScript config
  ...jsConfig,
  // Next.js config
  ...nextConfig,
  // TypeScript config
  ...typescriptConfig,
  // Perfectionist Config
  ...perfectionistConfig,
  // shadcn-ui/lint Config
  ...shadcnConfig,
  // Prettier config
  ...prettierConfig,
]);
