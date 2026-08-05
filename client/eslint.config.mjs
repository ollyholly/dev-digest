import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

/** `next/core-web-vitals` bundles eslint-plugin-react, react-hooks,
 * jsx-a11y, and @next/next — see the frontend-ui-architecture and
 * react-best-practices skills for the rules this is expected to enforce. */
const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [".next/**", "node_modules/**", "coverage/**", "next-env.d.ts"],
  },
];

export default eslintConfig;
